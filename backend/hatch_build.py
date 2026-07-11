# Quick 260708-x22: hatchling custom build hook.
#
# Copies the Next.js static export + writes a prod-defaults
# `package.json` into the `epubtv` package source tree BEFORE the
# wheel is packaged. Both files end up at the root of the
# `epubtv` package inside the wheel; the runtime container
# resolves them via `importlib.resources.files("epubtv")`.
#
# Contract:
#   - FRONTEND_OUT env var — path to the Next.js `out/`
#     directory. Default: "../frontend/out" (relative to the
#     `backend/` directory where pyproject.toml lives). The
#     Dockerfile backend-build stage sets
#     `FRONTEND_OUT=/app/frontend/out` (the Stage-1
#     `frontend-build` output path).
#   - `src/epubtv/www/` — destination for the frontend dist.
#     Created if missing; `shutil.copytree(..., dirs_exist_ok=True)`
#     so re-runs of `uv build` are idempotent.
#   - `src/epubtv/package.json` — written with the prod
#     defaults JSON consumed by `epubtv.config.package_json_settings`
#     at runtime. Overwritten on every build (the hatch hook is
#     the single source of truth for the prod default values).
#
# Gray-area resolutions (from the plan, recorded inline for
# future reviewer traceability):
#   - G1: the package.json `frontend_out` value is the literal
#     string `"www"`. The `Settings.frontend_out` field loads
#     that string, and the `@model_validator(mode="after")`
#     resolver in `config.py` swaps it for
#     `importlib.resources.files("epubtv") / "www"` when the
#     package is installed (env-var overrides still win via
#     pydantic-settings source precedence).
#   - G3: the `uv build` invocation in the Dockerfile +
#     developer workflow uses `uv` (project standard, ADR-locked)
#     which delegates to hatchling; the custom hook runs as part
#     of the standard hatchling build.
#   - G4: the runtime install is `uv pip install --python
#     /app/.venv/bin/python /tmp/dist/*.whl` (no system-Python
#     pollution); the launcher script `/usr/local/bin/run-in-venv.sh`
#     activates the venv at CMD time.
"""Custom hatchling build hook for the epubtv wheel."""

from __future__ import annotations

import json
import os
import shutil
from pathlib import Path
from typing import Any

from hatchling.builders.hooks.plugin.interface import BuildHookInterface

# JSON literal written to src/epubtv/package.json. Loaded by
# `epubtv.config.package_json_settings()` via
# `importlib.resources.files("epubtv").joinpath("package.json")`.
# `frontend_out: "www"` is the G1 marker — the runtime resolver
# in `config.py` swaps the relative string for the absolute
# install-tree path when the package is installed.
PACKAGE_JSON_DEFAULTS: dict[str, Any] = {
    "env": "prod",
    "frontend_out": "www",
    "serve_static": True,
}


class CustomBuildHook(BuildHookInterface):
    """Copy the frontend dist + write the package.json defaults.

    hatchling's `custom` build hook contract (see
    https://hatch.pypa.io/latest/plugins/build-hook/custom/):
    the `initialize` method is called once before the wheel
    is packaged; it can mutate the source tree (the `www/`
    + `package.json` files are picked up by hatchling's
    `include` pattern + the `packages = ["src/epubtv"]`
    wheel target).
    """

    PLUGIN_NAME = "custom"

    def initialize(self, version: str, build_data: dict[str, Any]) -> None:
        # Resolve paths relative to the project root (where
        # pyproject.toml lives). `os.path.realpath` collapses
        # `..` segments so the build is robust to `uv build`
        # being invoked from a different CWD.
        project_root = Path(os.path.realpath(self.root))
        frontend_out_env = os.environ.get("FRONTEND_OUT", "../frontend/out")
        frontend_out = Path(os.path.realpath(frontend_out_env))
        if not frontend_out.is_dir():
            raise RuntimeError(
                f"FRONTEND_OUT does not exist or is not a directory: {frontend_out} "
                f"(env value: {frontend_out_env!r}; resolved relative to project root: "
                f"{project_root})"
            )

        www_dir = project_root / "www"
        package_json_path = project_root / "package.json"

        # Frontend dist: drop dir tree (if any) and then copy the new one over
        shutil.rmtree(www_dir, ignore_errors=True)
        shutil.copytree(frontend_out, www_dir, dirs_exist_ok=True)
        if not (www_dir / "index.html").is_file():
            raise RuntimeError(
                f"Frontend dist copy did not produce www/index.html "
                f"(FRONTEND_OUT={frontend_out}); is the Next.js build present?"
            )

        # package.json: json.dump with indent=2 for human
        # readability when inspecting the wheel contents.
        with package_json_path.open("w", encoding="utf-8") as fh:
            json.dump(PACKAGE_JSON_DEFAULTS, fh, indent=2)
            fh.write("\n")
