#!/usr/bin/env python3
"""
app.py — веб-сервер Flask для порівняння двох STEP-файлів.

Запуск:
    python wsgi.py
    # або для локальної розробки
    python app.py
"""

import os
import sys
import math
import tempfile
import shutil
import uuid
from collections import OrderedDict
from pathlib import Path

from flask import Flask, Response, redirect, render_template, request, send_from_directory, url_for
from werkzeug.utils import secure_filename

sys.path.insert(0, str(Path(__file__).parent / "src"))

from compare import compare_nodes
from i18n import available_languages, normalize_lang, tr
from report import render_report
from step_tree import decode_path_id, ensure_lazy_assets, parse_step

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 200 * 1024 * 1024

_MAX_SESSIONS = 10
_sessions: OrderedDict = OrderedDict()


def _session_dir(session_value):
  """Return the session STL directory for legacy/new in-memory session formats."""
  if isinstance(session_value, dict):
    return session_value.get("dir")
  return session_value


def _touch_session(sid: str) -> None:
  """Mark a session as recently used for LRU eviction."""
  if sid in _sessions:
    _sessions.move_to_end(sid)


def _evict_old_sessions() -> None:
  """Remove least-recently-used sessions above the configured limit."""
  while len(_sessions) > _MAX_SESSIONS:
    _, old_session = _sessions.popitem(last=False)
    old_dir = _session_dir(old_session)
    if old_dir:
      shutil.rmtree(old_dir, ignore_errors=True)


def _new_session() -> tuple:
  """Створює нову temp-директорію для сесії, повертає (sid, dir_path)."""
  sid = uuid.uuid4().hex
  tmpdir = tempfile.mkdtemp(prefix="stptree_")
  _sessions[sid] = {"dir": tmpdir}
  _evict_old_sessions()
  return sid, tmpdir


def _send_session_file(stl_dir: str, filename: str, mimetype: str):
  """Serve a cached session file, returning a controlled 404 on filesystem errors."""
  try:
    return send_from_directory(stl_dir, filename, mimetype=mimetype)
  except OSError:
    return "", 404


@app.template_global("tr")
def _template_tr(key: str, **kwargs):
  """Expose active-language translations to Jinja templates."""
  lang = normalize_lang(getattr(request, "view_args", {}).get("lang") or request.args.get("lang"))
  if hasattr(request, "view_args") and request.view_args:
    lang = normalize_lang(request.args.get("lang") or request.form.get("lang") or lang)
  return tr(lang, key, **kwargs)


def _template_context(lang: str) -> dict:
  """Build common template context for localized pages."""
  lang = normalize_lang(lang)

  def tr_for(code: str, key: str, **kwargs):
    return tr(code, key, **kwargs)

  return {
    "lang": lang,
    "languages": available_languages(),
    "tr_for": tr_for,
    "tr": lambda key, **kwargs: tr(lang, key, **kwargs),
    "tolerance_toggle_label": tr(lang, "tolerance_toggle"),
  }


def _render_error_page(lang: str, msg: str) -> str:
  """Build a localized standalone error page."""
  ctx = _template_context(lang)
  ctx["message"] = msg
  return render_template("error.html", **ctx)


def _render_session_report(sid: str, lang: str) -> Response:
  """Render a cached compare result; language switches do not re-parse STEP files."""
  _touch_session(sid)
  session = _sessions.get(sid)
  stl_dir = _session_dir(session)
  if not stl_dir or not os.path.isdir(stl_dir):
    return Response(_render_error_page(lang, tr(lang, "internal_error_prefix")), status=404)

  if not isinstance(session, dict):
    return Response(_render_error_page(lang, tr(lang, "internal_error_prefix")), status=410)

  title_a = session.get("title_a")
  title_b = session.get("title_b")
  tree_a = session.get("tree_a")
  tree_b = session.get("tree_b")
  diff = session.get("diff")

  if title_a is None or title_b is None or tree_a is None or tree_b is None or diff is None:
    return Response(_render_error_page(lang, tr(lang, "internal_error_prefix")), status=410)

  html_report = render_report(
    diff,
    title_a,
    title_b,
    tree_a=tree_a,
    tree_b=tree_b,
    lang=lang,
    lang_switch_url_template=f"/report/{sid}?lang={{code}}",
    back_url=f"/?lang={lang}",
    asset_sid=sid,
  )
  return Response(html_report, mimetype="text/html; charset=utf-8")


_ALLOWED = {".stp", ".step"}


def _allowed(filename: str) -> bool:
  """Return True when an uploaded filename has an allowed STEP extension."""
  return Path(filename).suffix.lower() in _ALLOWED


@app.route("/")
def index():
  """Serve the localized upload page."""
  lang = normalize_lang(request.args.get("lang"))
  return render_template("upload.html", **_template_context(lang))


@app.route("/healthz")
def healthz():
  """Return a minimal health response for runtime probes."""
  return Response("ok", mimetype="text/plain; charset=utf-8")


@app.route("/asset/<sid>/<side>/<encoded_path>.<ext>")
def serve_lazy_asset(sid, side, encoded_path, ext):
  """Generate and serve STL/PNG assets on demand for a cached session node."""
  if side not in {"a", "b"} or ext not in {"stl", "png"}:
    return "", 400

  _touch_session(sid)
  session = _sessions.get(sid)
  stl_dir = _session_dir(session)
  if not stl_dir or not isinstance(session, dict):
    return "", 404

  holder = session.get("holder_a" if side == "a" else "holder_b")
  if not holder:
    return "", 404

  path_id = decode_path_id(encoded_path)
  try:
    stl_name = ensure_lazy_assets(path_id, holder, stl_dir)
  except OSError:
    return "", 404
  if not stl_name:
    return "", 404

  basename = stl_name[:-4]
  filename = f"{basename}.{ext}"
  try:
    full = os.path.join(stl_dir, filename)
    if not os.path.isfile(full):
      return "", 404
  except OSError:
    return "", 404

  mimetype = "image/png" if ext == "png" else "application/octet-stream"
  return _send_session_file(stl_dir, filename, mimetype)


@app.route("/stl/<sid>/<filename>")
def serve_stl(sid, filename):
  """Serve legacy eager STL/PNG assets from the session cache directory."""
  _touch_session(sid)
  stl_dir = _session_dir(_sessions.get(sid))
  if not stl_dir or not os.path.isdir(stl_dir):
    return "", 404
  safe = secure_filename(filename)
  if not safe or safe != filename or not (safe.endswith(".stl") or safe.endswith(".png")):
    return "", 400
  try:
    full = os.path.join(stl_dir, safe)
    if not os.path.isfile(full):
      return "", 404
  except OSError:
    return "", 404
  mimetype = "image/png" if safe.endswith(".png") else "application/octet-stream"
  return _send_session_file(stl_dir, safe, mimetype)


@app.route("/compare", methods=["POST"])
def compare():
  """Compare two uploaded STEP files and return a localized HTML report."""
  lang = normalize_lang(request.form.get("lang") or request.args.get("lang"))
  fa = request.files.get("file_a")
  fb = request.files.get("file_b")

  if not fa or not fa.filename or not fb or not fb.filename:
    return _render_error_page(lang, tr(lang, "no_files_error")), 400

  if not _allowed(fa.filename):
    return _render_error_page(lang, tr(lang, "unsupported_format_a", filename=fa.filename)), 400
  if not _allowed(fb.filename):
    return _render_error_page(lang, tr(lang, "unsupported_format_b", filename=fb.filename)), 400

  try:
    vol_tol = float(request.form.get("volume_tol", 0.5))
    com_tol = float(request.form.get("com_tol", 0.1))
  except ValueError:
    return _render_error_page(lang, tr(lang, "invalid_tolerance_error")), 400

  if not math.isfinite(vol_tol) or not math.isfinite(com_tol) or vol_tol < 0 or com_tol < 0:
    return _render_error_page(lang, tr(lang, "invalid_tolerance_error")), 400

  try:
    sid, stl_dir = _new_session()
    uploads = os.path.join(stl_dir, "uploads")
    os.makedirs(uploads)

    safe_name_a = secure_filename(fa.filename) or "file_a.step"
    safe_name_b = secure_filename(fb.filename) or "file_b.step"
    path_a = os.path.join(uploads, f"a_{uuid.uuid4().hex}_{safe_name_a}")
    path_b = os.path.join(uploads, f"b_{uuid.uuid4().hex}_{safe_name_b}")

    fa.save(path_a)
    fb.save(path_b)

    holder_a: dict = {}
    holder_b: dict = {}
    tree_a = parse_step(path_a, holder=holder_a)
    tree_b = parse_step(path_b, holder=holder_b)
    diff = compare_nodes(tree_a, tree_b, volume_tol_pct=vol_tol, com_tol_mm=com_tol)

    _sessions[sid].update({
      "path_a": path_a,
      "path_b": path_b,
      "title_a": fa.filename,
      "title_b": fb.filename,
      "volume_tol": vol_tol,
      "com_tol": com_tol,
      "tree_a": tree_a,
      "tree_b": tree_b,
      "diff": diff,
      "holder_a": holder_a,
      "holder_b": holder_b,
    })
    return redirect(url_for("report_for_session", sid=sid, lang=lang), code=303)
  except RuntimeError:
    app.logger.exception("Failed to read or parse uploaded STEP files")
    return _render_error_page(lang, tr(lang, "read_error_prefix")), 422
  except Exception:  # noqa: BLE001
    app.logger.exception("Unhandled exception in /compare")
    return _render_error_page(lang, tr(lang, "internal_error_prefix")), 500


@app.route("/report/<sid>")
def report_for_session(sid):
  """Render existing compare result for another language without re-upload."""
  _touch_session(sid)
  lang = normalize_lang(request.args.get("lang"))
  try:
    return _render_session_report(sid, lang)
  except RuntimeError:
    app.logger.exception("Failed to rebuild report from stored session")
    return Response(_render_error_page(lang, tr(lang, "read_error_prefix")), status=422)
  except Exception:  # noqa: BLE001
    app.logger.exception("Unhandled exception in /report/<sid>")
    return Response(_render_error_page(lang, tr(lang, "internal_error_prefix")), status=500)


if __name__ == "__main__":
  host = os.environ.get("APP_HOST", "0.0.0.0")
  port = int(os.environ.get("APP_PORT", "5000"))
  app.run(debug=False, host=host, port=port)
