"""
report.py — рендерить дерева Node і DiffNode у самодостатній HTML-файл.

3-панельний layout (дерево A | diff | дерево B) з колапсованими вузлами.

Кольори diff:
  match   -> зелений
  changed -> жовтогарячий
  added   -> синій
  removed -> червоний
"""

from __future__ import annotations

import html
import json
from urllib.parse import quote
from typing import Optional

from compare import DiffNode
from i18n import available_languages, normalize_lang, tr
from step_tree import encode_path_id

COLORS = {
    "match": "#2e7d32",
    "changed": "#e65100",
    "added": "#1565c0",
    "removed": "#c62828",
}


def _json_for_script(payload: dict) -> str:
    """Serialize JSON for safe embedding inside an HTML <script> tag."""
    return json.dumps(payload, ensure_ascii=False).replace("<", "\\u003c")

def _status_label(lang: str, status: str) -> str:
    """Return localized status label for a diff state."""
    return tr(lang, f"status_{status}")


def _empty_preview(lang: str) -> str:
    """Return a data-URI SVG placeholder used when PNG preview is unavailable."""
    return "data:image/svg+xml;charset=utf-8," + quote(
        "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='180' viewBox='0 0 240 180'>"
        "<rect width='240' height='180' fill='#d8d1be'/>"
        "<rect x='18' y='18' width='204' height='144' rx='8' fill='#ebe5d6' stroke='#b8af9a'/>"
        f"<text x='120' y='90' text-anchor='middle' font-family='sans-serif' font-size='26' fill='#6c6a60'>{tr(lang, 'preview_png')}</text>"
        f"<text x='120' y='120' text-anchor='middle' font-family='sans-serif' font-size='12' fill='#6c6a60'>{tr(lang, 'preview_unavailable')}</text>"
        "</svg>",
        safe="",
    )

_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

:root {
    --bg: #d9d5c8;
    --panel: #efecdf;
    --head: #d8d1bc;
    --line: #b9b09a;
    --text: #2b2b2b;
    --muted: #5f5c52;
    --brand-a: #355f84;
    --brand-b: #4b6a55;
    --viewer-bg: #d2d5dc;
}

body[data-theme="dark"] {
    --bg: #151820;
    --panel: #202632;
    --head: #2a3242;
    --line: #3a465d;
    --text: #e9eef8;
    --muted: #9cacbf;
    --brand-a: #8bc2ff;
    --brand-b: #97d7ad;
    --viewer-bg: #121722;
}

* { box-sizing: border-box; }
body {
    margin: 0;
    color: var(--text);
    background: linear-gradient(180deg, #cfc9b8, var(--bg));
    font-family: 'Space Grotesk', sans-serif;
    min-height: 100vh;
}

.wrap { padding: 18px; }
.topbar {
    margin-bottom: 12px;
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 10px 12px;
    background: linear-gradient(180deg, #f4f0e4, #e8e3d3);
}
h1 { margin: 0 0 8px; font-size: 20px; font-weight: 700; letter-spacing: .01em; }
.summary { font-size: 13px; color: #413e36; line-height: 1.8; }

.layout {
    display: grid;
    grid-template-columns: 1fr 460px;
    gap: 12px;
}

.panels {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    align-items: start;
}

.panel {
    background: var(--panel);
    color: var(--text);
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid var(--line);
    box-shadow: 0 2px 8px #0000001f;
    min-width: 0;
}

.panel-header {
    padding: 8px 10px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .07em;
    border-bottom: 1px solid var(--line);
    position: sticky;
    top: 0;
    z-index: 1;
    background: linear-gradient(180deg, #ded7c3, var(--head));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.panel-header.a { color: var(--brand-b); }
.panel-header.b { color: var(--brand-a); }
.panel-header.diff { color: #8a4308; }

.panel-body {
    padding: 8px;
    max-height: calc(100vh - 175px);
    overflow-y: auto;
}

.node {
    margin: 2px 0;
    padding: 4px 6px;
    border-radius: 3px;
    border: 1px solid #d6cfbb;
    background: #f6f2e7;
}

.node-header {
    display: flex;
    align-items: center;
    gap: 6px;
}

.toggle {
    width: 14px;
    flex-shrink: 0;
    color: #637583;
    font-size: 11px;
    user-select: none;
    cursor: pointer;
}

.icon { opacity: .65; font-size: 11px; color: #4c5f6f; }

.thumb {
    width: 42px;
    height: 32px;
    border-radius: 3px;
    border: 1px solid #beb5a2;
    object-fit: cover;
    background: linear-gradient(145deg, #e6e0d2, #d6cdb9);
    flex-shrink: 0;
}

.name {
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    cursor: default;
}

.stl-link { cursor: pointer; text-decoration: underline dotted; text-underline-offset: 3px; }
.stl-link:hover { color: #1a4f78; }
.name.active-node { color: #1a4f78; }
.stl-thumb { cursor: pointer; }
.stl-thumb.active-node { outline: 2px solid #5aa0df; outline-offset: 1px; }

body[data-theme="dark"] .stl-link:hover,
body[data-theme="dark"] .name.active-node {
    color: #8bc2ff;
}

.badge {
    margin-left: auto;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 3px;
    color: #fff;
    flex-shrink: 0;
}

.node-details {
    padding-left: 62px;
    margin-top: 2px;
    font-size: 11px;
    color: var(--muted);
    font-family: 'JetBrains Mono', monospace;
}

.plain-vol { color: #125a8a; }
.plain-com { color: #0e6b5e; }

.viewer {
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 4px;
    overflow: hidden;
    min-height: 560px;
    box-shadow: 0 2px 8px #0000001f;
}

.viewer-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--line);
    background: linear-gradient(180deg, #ded7c3, var(--head));
}

.viewer-title {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 13px;
    font-weight: 700;
}

.viewer-btn {
    background: #f4f1e7;
    color: #2f2c26;
    border: 1px solid #b6ad98;
    border-radius: 3px;
    padding: 5px 9px;
    font-size: 11px;
    cursor: pointer;
}

body[data-theme="dark"] .viewer-btn {
    background: #263247;
    color: #e9eef8;
    border-color: #536381;
}

.viewer-main {
    display: grid;
    grid-template-columns: 1fr 150px;
    gap: 8px;
    padding: 8px;
}

.viewer-stage {
    position: relative;
    height: 430px;
    background: var(--viewer-bg);
    border: 1px solid #aaa38f;
}

#viewer-canvas {
    width: 100%;
    height: 100%;
    display: block;
}

.viewer-msg,
.viewer-err {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    text-align: center;
    font-size: 13px;
}

.viewer-msg { color: #4e5966; }
.viewer-err { color: #f2a1ad; display: none; }

.viewer-side {
    border: 1px solid #aaa38f;
    background: #ebe6d9;
    display: flex;
    flex-direction: column;
}

.viewer-side-head {
    padding: 6px 7px;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .08em;
    border-bottom: 1px solid #aaa38f;
    background: #dcd5c2;
}

.viewer-side-body {
    padding: 7px;
    flex: 1;
}

#viewer-thumb {
    width: 100%;
    height: 112px;
    object-fit: cover;
    border: 1px solid #b8af9a;
    background: linear-gradient(145deg, #dbd3bf, #cec4ad);
}

.viewer-meta {
    margin-top: 8px;
    font-size: 11px;
    color: #565247;
    line-height: 1.5;
}

.viewer-foot {
    font-size: 11px;
    color: #615d52;
    text-align: center;
    padding: 8px;
    border-top: 1px solid var(--line);
}

.spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid #446173;
    border-top-color: #b7d6e8;
    animation: spin .75s linear infinite;
    margin-right: 6px;
}

@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 1200px) {
    .layout { grid-template-columns: 1fr; }
    .viewer { min-height: 460px; }
    .viewer-main { grid-template-columns: 1fr; }
    .viewer-stage { height: 390px; }
    #viewer-thumb { height: 180px; }
}

@media (max-width: 900px) {
    .panels { grid-template-columns: 1fr; }
    .panel-body { max-height: 42vh; }
}
"""

_JS = """
function tog(btn, childId) {
  var el = document.getElementById(childId);
  if (!el) return;
  var collapsed = el.style.display === 'none';
  el.style.display = collapsed ? '' : 'none';
  btn.textContent = collapsed ? '▾' : '▸';
}
"""

_THREE_SCRIPT = """
var scene, camera, renderer, controls, mesh, loader;

function fitCamera(cam, ctrl, m, scale) {
    m.geometry.computeBoundingBox();
    var box = m.geometry.boundingBox;
    var center = new THREE.Vector3();
    var size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    var d = Math.max(size.x, size.y, size.z) || 1;
    m.position.sub(center);
    cam.position.set(d * 1.8 * scale, d * 1.3 * scale, d * 2.4 * scale);
    cam.lookAt(0, 0, 0);
    cam.near = d * 0.001;
    cam.far = d * 500;
    cam.updateProjectionMatrix();
    if (ctrl) {
        ctrl.target.set(0, 0, 0);
        ctrl.update();
    }
}

function initViewer() {
    if (typeof THREE === 'undefined' || !THREE.STLLoader || !THREE.OrbitControls) {
        document.getElementById('viewer-msg').textContent = (window.I18N && window.I18N.viewer_engine_missing) || '3D engine failed to load';
        return;
    }
    var canvas = document.getElementById('viewer-canvas');
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xd2d5dc);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    var dl1 = new THREE.DirectionalLight(0xffffff, 0.95); dl1.position.set(1.1, 2.0, 2.5); scene.add(dl1);
    var dl2 = new THREE.DirectionalLight(0x88c8ff, 0.35); dl2.position.set(-2.2, -1.0, -1.2); scene.add(dl2);

    camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1e6);
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    loader = new THREE.STLLoader();

    function resize() {
        var wrap = document.querySelector('.viewer-stage');
        var w = Math.max(wrap.clientWidth, 100);
        var h = Math.max(wrap.clientHeight, 100);
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    window.addEventListener('resize', resize);
    resize();

    (function loop() {
        requestAnimationFrame(loop);
        controls.update();
        renderer.render(scene, camera);
    })();
}

window.selectElementFrom = function (el) {
    var target = el;
    if (!target || !target.getAttribute('data-stl-url')) {
        target = el.closest('[data-stl-url]');
    }
    if (!target) return;

    var url = target.getAttribute('data-stl-url');
    var pngUrl = target.getAttribute('data-png-url');
    var title = target.getAttribute('data-stl-title') || ((window.I18N && window.I18N.preview_title) || 'Element');
    if (!url) return;

    document.querySelectorAll('.name.active-node, .stl-thumb.active-node').forEach(function (n) { n.classList.remove('active-node'); });
    if (target.classList.contains('name') || target.classList.contains('stl-thumb')) {
        target.classList.add('active-node');
    }

    var viewerThumb = document.getElementById('viewer-thumb');
    viewerThumb.onerror = function () {
        this.onerror = null;
        this.src = this.getAttribute('data-fallback');
    };
    viewerThumb.src = pngUrl || viewerThumb.getAttribute('data-fallback');

    document.getElementById('viewer-meta-name').textContent = title;
    document.getElementById('viewer-meta-url').textContent = url;
    document.getElementById('viewer-title').textContent = title;
    document.getElementById('viewer-msg').style.display = 'flex';
    document.getElementById('viewer-msg').innerHTML = '<span class="spinner"></span>' + (((window.I18N && window.I18N.viewer_loading) || 'Loading STL...'));
    document.getElementById('viewer-err').style.display = 'none';

    if (!renderer) initViewer();
    if (!loader) {
        document.getElementById('viewer-msg').style.display = 'none';
        document.getElementById('viewer-err').style.display = 'flex';
        return;
    }

    if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        mesh = null;
    }

    loader.load(
        url,
        function (geo) {
            geo.computeVertexNormals();
            mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: 0x8aa0ba, specular: 0x4d6072, shininess: 55 }));
            scene.add(mesh);
            fitCamera(camera, controls, mesh, 1.0);
            document.getElementById('viewer-msg').style.display = 'none';
        },
        undefined,
        function () {
            document.getElementById('viewer-msg').style.display = 'none';
            document.getElementById('viewer-err').style.display = 'flex';
        }
    );
};

window.clearViewer = function () {
    if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        mesh = null;
    }
    document.querySelectorAll('.name.active-node, .stl-thumb.active-node').forEach(function (n) { n.classList.remove('active-node'); });
    document.getElementById('viewer-title').textContent = (window.I18N && window.I18N.viewer_title_none) || 'Current element: none';
        document.getElementById('viewer-thumb').src = document.getElementById('viewer-thumb').getAttribute('data-fallback');
    document.getElementById('viewer-meta-name').textContent = '—';
    document.getElementById('viewer-meta-url').textContent = '—';
    document.getElementById('viewer-err').style.display = 'none';
    document.getElementById('viewer-msg').style.display = 'flex';
    document.getElementById('viewer-msg').textContent = (window.I18N && window.I18N.viewer_choose) || 'Select an element in the tree to open STL.';
};

document.addEventListener('DOMContentLoaded', function () {
    if (typeof THREE === 'undefined' || !THREE.STLLoader || !THREE.OrbitControls) {
        document.getElementById('viewer-msg').textContent = (window.I18N && window.I18N.viewer_browser_unsupported) || 'Browser does not support 3D viewer or CDN is unavailable';
        return;
    }
    document.getElementById('viewer-thumb').src = (window.I18N && window.I18N.empty_preview) || document.getElementById('viewer-thumb').getAttribute('data-fallback');
    initViewer();
});

function applyTheme(theme) {
    var root = document.body;
    var toggle = document.getElementById('theme-toggle');
    if (!root || !toggle) return;

    var resolved = theme === 'dark' ? 'dark' : 'light';
    root.setAttribute('data-theme', resolved);

    if (window.I18N) {
        var text = resolved === 'dark' ? (window.I18N.theme_light || 'Light') : (window.I18N.theme_dark || 'Dark');
        toggle.textContent = text;
    }
}

window.toggleTheme = function () {
    var current = document.body.getAttribute('data-theme') || 'light';
    var next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('reportTheme', next);
    applyTheme(next);
};

document.addEventListener('DOMContentLoaded', function () {
    var saved = localStorage.getItem('reportTheme') || 'light';
    applyTheme(saved);
});
"""


def _fmt(v):
    """Format optional numeric values for report output."""
    return "—" if v is None else v


def _node_has_geometry(node) -> bool:
    """Return True when a node has enough geometry metadata for preview export."""
    return node.volume is not None or node.bbox is not None


def _lazy_asset_urls(asset_sid: str, side: str, path_id: str) -> tuple[str, str]:
    """Build lazy STL/PNG URLs for a node path within a web session."""
    encoded = encode_path_id(path_id)
    base = f"/asset/{asset_sid}/{side}/{encoded}"
    return f"{base}.stl", f"{base}.png"


# ---------- Plain Node renderer ----------

def _render_plain_node(
    node,
    depth: int,
    ctr: list,
    stl_base_url: str = None,
    lang: str = "uk",
    asset_sid: str = None,
    asset_side: str = None,
) -> str:
    """Render one plain tree node (A or B side) recursively as HTML."""
    ctr[0] += 1
    uid = f"p{ctr[0]}"
    icon = "▣" if node.is_assembly else "◆"
    has_ch = bool(node.children)

    toggle_btn = f'<span class="toggle" onclick="tog(this,\'{uid}-ch\')" title="розгорнути/згорнути">▾</span>' if has_ch else '<span class="toggle"></span>'

    header_cls = "node-header has-children" if has_ch else "node-header"
    name_esc = html.escape(node.name)
    preview_alt = html.escape(tr(lang, "preview_title"), quote=True)
    open_title = html.escape(tr(lang, "open_selected_element"), quote=True)
    fallback = html.escape(_empty_preview(lang), quote=True)
    onerror_js = "this.onerror=null;this.src=this.dataset.fallback"

    if asset_sid and asset_side and node.path_id and _node_has_geometry(node):
        stl_url_raw, png_url_raw = _lazy_asset_urls(asset_sid, asset_side, node.path_id)
        stl_url = html.escape(stl_url_raw, quote=True)
        png_url = html.escape(png_url_raw, quote=True)
        thumb_html = (
            f'<img class="thumb stl-thumb" src="{png_url}" loading="lazy" '
            f'data-stl-url="{stl_url}" data-png-url="{png_url}" data-fallback="{fallback}" '
            f'data-stl-title="{name_esc}" alt="{preview_alt}" onerror="{onerror_js}" onclick="selectElementFrom(this)">'
        )
        name_html = (f'<span class="name stl-link" title="{open_title} ({name_esc})" '
                     f'data-stl-url="{stl_url}" data-png-url="{png_url}" data-stl-title="{name_esc}" '
                     f'onclick="selectElementFrom(this)">{name_esc}</span>')
    elif stl_base_url and node.stl_id:
        stl_url_raw = stl_base_url + node.stl_id
        png_url_raw = stl_url_raw[:-4] + ".png"
        stl_url = html.escape(stl_url_raw, quote=True)
        png_url = html.escape(png_url_raw, quote=True)
        thumb_html = (
            f'<img class="thumb stl-thumb" src="{png_url}" '
            f'data-stl-url="{stl_url}" data-png-url="{png_url}" data-fallback="{fallback}" '
            f'data-stl-title="{name_esc}" alt="{preview_alt}" onerror="{onerror_js}" onclick="selectElementFrom(this)">'
        )
        name_html = (f'<span class="name stl-link" title="{open_title} ({name_esc})" '
                     f'data-stl-url="{stl_url}" data-png-url="{png_url}" data-stl-title="{name_esc}" '
                     f'onclick="selectElementFrom(this)">{name_esc}</span>')
    else:
        thumb_html = f'<img class="thumb" alt="{html.escape(tr(lang, "preview_unavailable"), quote=True)}">'
        name_html = f'<span class="name" title="{name_esc}">{name_esc}</span>'

    vol_str = f'<span class="plain-vol">V={node.volume}</span>' if node.volume is not None else ""
    com_str = f'<span class="plain-com">  COM={node.com}</span>' if node.com is not None else ""
    details = f'<div class="node-details">{vol_str}{com_str}</div>' if (vol_str or com_str) else ""

    children_html = ""
    if has_ch:
        inner = "".join(
            _render_plain_node(
                c,
                depth + 1,
                ctr,
                stl_base_url,
                lang=lang,
                asset_sid=asset_sid,
                asset_side=asset_side,
            )
            for c in node.children
        )
        children_html = f'<div class="children" id="{uid}-ch">{inner}</div>'

    indent = depth * 18
    return (
        f'<div class="node" style="margin-left:{indent}px">'
        f'<div class="{header_cls}">'
        f'{toggle_btn}<span class="icon">{icon}</span>{thumb_html}{name_html}'
        f'</div>{details}{children_html}</div>'
    )


# ---------- Diff Node renderer ----------

def _render_diff_node(node: DiffNode, depth: int, ctr: list, lang: str = "uk") -> str:
    """Render one diff tree node recursively as HTML."""
    ctr[0] += 1
    uid = f"d{ctr[0]}"
    color = COLORS[node.status]
    label = _status_label(lang, node.status)
    icon = "▣" if node.is_assembly else "◆"
    has_ch = bool(node.children)

    toggle_btn = f'<span class="toggle" onclick="tog(this,\'{uid}-ch\')" title="розгорнути/згорнути">▾</span>' if has_ch else '<span class="toggle"></span>'

    header_cls = "node-header has-children" if has_ch else "node-header"
    name_esc = html.escape(node.name)

    vol_line = f"V(A)={_fmt(node.volume_a)}  V(B)={_fmt(node.volume_b)}"
    if node.volume_delta_pct is not None:
        vol_line += f"  Δ={node.volume_delta_pct}%"
    com_line = f"COM(A)={_fmt(node.com_a)}  COM(B)={_fmt(node.com_b)}"
    if node.com_delta_mm is not None:
        com_line += f"  |Δ|={node.com_delta_mm} мм"

    details = (
        f'<div class="node-details">'
        f'<div>{html.escape(vol_line)}</div>'
        f'<div>{html.escape(com_line)}</div>'
        f'</div>'
    )

    children_html = ""
    if has_ch:
        inner = "".join(_render_diff_node(c, depth + 1, ctr, lang=lang) for c in node.children)
        children_html = f'<div class="children" id="{uid}-ch">{inner}</div>'

    indent = depth * 18
    return (
        f'<div class="node" style="margin-left:{indent}px; border-left: 3px solid {color};">'
        f'<div class="{header_cls}">'
        f'{toggle_btn}<span class="icon">{icon}</span>'
        f'<span class="name" title="{name_esc}">{name_esc}</span>'
        f'<span class="badge" style="background:{color}">{label}</span>'
        f'</div>{details}{children_html}</div>'
    )


def _count(node: DiffNode, acc: dict = None) -> dict:
    """Accumulate recursive diff-status counts for summary badges."""
    if acc is None:
        acc = {"total": 0, "match": 0, "changed": 0, "added": 0, "removed": 0}
    acc["total"] += 1
    acc[node.status] += 1
    for c in node.children:
        _count(c, acc)
    return acc


def render_report(root: DiffNode, title_a: str, title_b: str,
                                    tree_a=None, tree_b=None,
                                    stl_base_url: str = None,
                                    lang: str = "uk",
                                    lang_switch_url_template: str = "/?lang={code}",
                                    back_url: str = None,
                                    asset_sid: str = None) -> str:
    """Build a full localized HTML report with A/B trees, diff panel, and 3D viewer."""
    lang = normalize_lang(lang)
    total = _count(root)
    empty_preview = _empty_preview(lang)
    empty_preview_attr = html.escape(empty_preview, quote=True)
    i18n_payload = {
        "viewer_engine_missing": tr(lang, "viewer_engine_missing"),
        "viewer_loading": tr(lang, "viewer_loading"),
        "preview_title": tr(lang, "preview_title"),
        "viewer_title_none": tr(lang, "viewer_title_none"),
        "viewer_choose": tr(lang, "viewer_choose"),
        "viewer_browser_unsupported": tr(lang, "viewer_browser_unsupported"),
        "empty_preview": empty_preview,
        "theme_dark": tr(lang, "theme_dark"),
        "theme_light": tr(lang, "theme_light"),
    }
    lang_links = " | ".join(
        f'<a href="{html.escape(lang_switch_url_template.format(code=code))}">{tr(code, "language_label")}</a>'
        for code in available_languages()
    )
    if back_url is None:
        back_url = f"/?lang={lang}"

    summary = (
        f"<b>{html.escape(title_a)}</b> (A) &nbsp;vs&nbsp; <b>{html.escape(title_b)}</b> (B)<br>"
        f"{tr(lang, 'compare_summary_nodes')}: {total['total']} &nbsp;·&nbsp; "
        f"<span style='color:{COLORS['match']}'>{tr(lang, 'compare_summary_ok')}: {total['match']}</span> &nbsp;·&nbsp; "
        f"<span style='color:{COLORS['changed']}'>{tr(lang, 'compare_summary_changed')}: {total['changed']}</span> &nbsp;·&nbsp; "
        f"<span style='color:{COLORS['added']}'>{tr(lang, 'compare_summary_added')}: {total['added']}</span> &nbsp;·&nbsp; "
        f"<span style='color:{COLORS['removed']}'>{tr(lang, 'compare_summary_removed')}: {total['removed']}</span>"
    )

    diff_html = _render_diff_node(root, 0, [0], lang=lang)

    if tree_a is not None and tree_b is not None:
        plain_a = _render_plain_node(tree_a, 0, [0], stl_base_url, lang=lang, asset_sid=asset_sid, asset_side="a")
        plain_b = _render_plain_node(tree_b, 0, [0], stl_base_url, lang=lang, asset_sid=asset_sid, asset_side="b")
        body = f"""
<div class="panels">
    <div class="panel">
        <div class="panel-header a">▤ {tr(lang, 'compare_panel_a')} · {html.escape(title_a)}</div>
        <div class="panel-body">{plain_a}</div>
    </div>
    <div class="panel">
        <div class="panel-header diff">⇄ {tr(lang, 'compare_panel_diff')}</div>
        <div class="panel-body">{diff_html}</div>
    </div>
    <div class="panel">
        <div class="panel-header b">▤ {tr(lang, 'compare_panel_b')} · {html.escape(title_b)}</div>
        <div class="panel-body">{plain_b}</div>
    </div>
</div>"""
    else:
        body = f'<div class="panel-body">{diff_html}</div>'

    html_report = f"""<!DOCTYPE html>
<html lang="{lang}" translate="no">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="google" content="notranslate">
<title>{tr(lang, 'compare_title')} — {html.escape(title_a)} vs {html.escape(title_b)}</title>
<style>{_CSS}</style>
</head>
<body>
<div class="wrap">
    <div class="topbar">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">
            <h1>{tr(lang, 'compare_title')}</h1>
            <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;font-size:12px;color:#5b574d;">
                <button id="theme-toggle" class="viewer-btn" onclick="toggleTheme()">{tr(lang, 'theme_dark')}</button>
                <a href="{html.escape(back_url)}" style="text-decoration:none;border:1px solid #b9b09a;padding:4px 9px;border-radius:999px;background:#efecdf;color:#2b2b2b;">← {tr(lang, 'error_back')}</a>
                <div>{tr(lang, 'report_language_label')}: {lang_links}</div>
            </div>
        </div>
        <div class="summary">{summary}</div>
    </div>

    <div class="layout">
        {body}
        <div class="viewer">
            <div class="viewer-head">
                <span class="viewer-title" id="viewer-title">{tr(lang, 'viewer_title_none')}</span>
                <button class="viewer-btn" onclick="clearViewer()">{tr(lang, 'viewer_clear')}</button>
            </div>
                        <div class="viewer-main">
                                <div class="viewer-stage">
                                        <canvas id="viewer-canvas"></canvas>
                                        <div class="viewer-msg" id="viewer-msg">{tr(lang, 'viewer_choose')}</div>
                                        <div class="viewer-err" id="viewer-err">{tr(lang, 'viewer_error')}</div>
                                </div>
                                <div class="viewer-side">
                                        <div class="viewer-side-head">{tr(lang, 'viewer_side_head')}</div>
                                        <div class="viewer-side-body">
                                                <img id="viewer-thumb" src="{empty_preview_attr}" data-fallback="{empty_preview_attr}" alt="{html.escape(tr(lang, 'preview_title'), quote=True)}">
                                                <div class="viewer-meta">
                                                        <div><b>{tr(lang, 'viewer_meta_name')}:</b> <span id="viewer-meta-name">—</span></div>
                                                        <div><b>{tr(lang, 'viewer_meta_stl')}:</b> <span id="viewer-meta-url">—</span></div>
                                                </div>
                                        </div>
                                </div>
            </div>
            <div class="viewer-foot">{tr(lang, 'viewer_controls')}</div>
        </div>
    </div>
</div>

<script src="https://unpkg.com/three@0.128.0/build/three.min.js" integrity="sha384-CI3ELBVUz9XQO+97x6nwMDPosPR5XvsxW2ua7N1Xeygeh1IxtgqtCkGfQY9WWdHu" crossorigin="anonymous"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/controls/OrbitControls.js" integrity="sha384-wagZhIFgY4hD+7awjQjR4e2E294y6J2HSnd8eTNc15ZubTeQeVRZwhQJ+W6hnBsf" crossorigin="anonymous"></script>
<script src="https://unpkg.com/three@0.128.0/examples/js/loaders/STLLoader.js" integrity="sha384-QF8EmP6pyNE+i7WmcltzC4ddzFVKDxfn5WD5gXyKTSE4SCw0R25TI+q0LUlnf7tq" crossorigin="anonymous"></script>
<script>window.I18N = {_json_for_script(i18n_payload)};</script>
<script>{_THREE_SCRIPT}</script>
<script>{_JS}</script>
</body>
</html>"""
    return html_report
