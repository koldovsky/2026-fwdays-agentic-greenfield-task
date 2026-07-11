# Single-container demo image — ADR-0003 (single uvicorn, single image).
# 3-stage build (Quick 260708-x22):
#   Stage 1 (`frontend-build`, unchanged) — node:22-alpine, builds the
#     Next.js static export to /app/frontend/out.
#   Stage 2 (`backend-build`, NEW throwaway stage) — python:3.13-slim +
#     uv; mounts the backend/ project, sets FRONTEND_OUT to the Stage 1
#     output path, runs `uv build` (delegates to hatchling which runs
#     the custom hook in backend/hatch_build.py — copies the frontend
#     into src/epubtv/www/ + writes src/epubtv/package.json with the
#     prod defaults). Output: /tmp/dist/epubtv-*.whl. Throwaway stage;
#     the final image only needs the wheel.
#   Stage 3 (`backend`, REFACTORED final image) — python:3.13-slim;
#     installs ffmpeg + uv + the launcher; creates /app/.venv with
#     `uv venv`; installs the wheel into the venv with
#     `uv pip install --python /app/.venv/bin/python /tmp/dist/*.whl`;
#     bakes NLTK punkt_tab into the venv's site-packages via
#     /app/.venv/bin/python -m epubtv.tools.bake_nltk; copies the
#     launcher to /usr/local/bin/run-in-venv.sh; CMD invokes the
#     launcher to run uvicorn (same-origin SPA + API).
#
# Why a venv: the wheel declares its runtime deps in pyproject.toml;
# installing into a venv keeps the system Python untouched (per G4)
# AND makes the venv's site-packages the canonical install location
# (so `import epubtv` resolves to /app/.venv/lib/python3.13/site-packages/epubtv,
# not a path-mapped editable install).
#
# Runtime volume mounts (NOT baked into the image):
#   /app/db    → EPUBTV_DB_PATH=/app/db/epubtv.db  (SQLite WAL on host)
#   /app/scratch → EPUBTV_SCRATCH_DIR=/app/scratch  (artifact scratch dir)
#   /app/audio → EPUBTV_AUDIO_DIR=/app/audio  (per-chapter WAVs)
#   /app/artifacts → EPUBTV_ARTIFACT_DIR=/app/artifacts  (DL-01)

# Buildtime constants (DOCKER-02 / Phase 1 plan 05):
#   - DEFAULT_OLLAMA_URL: the default Ollama Base URL the SPA
#     pre-populates in the translation form. Default =
#     http://mock-llm:8765/ (the in-network URL of the
#     `mock-llm` compose service). Ollama's native endpoints
#     live at `/api/generate` + `/api/tags` (no `/v1` prefix);
#     the `OllamaHttpTranslationAdapter` strips a trailing
#     `/v1` for forward-compat but the bare-service-root
#     shape is the canonical Ollama form.
#   - DEFAULT_OPENAI_URL: the default OpenAI Base URL the SPA
#     pre-populates in the translation + voiceover forms.
#     OpenAI-compatible endpoints mount under `/v1/...` so
#     the base URL carries the `/v1` suffix.
#   - NEXT_PUBLIC_DEFAULT_OLLAMA_URL + NEXT_PUBLIC_DEFAULT_OPENAI_URL:
#     the same values exposed to the frontend static export
#     (Next.js `NEXT_PUBLIC_*` env vars are inlined at build
#     time).
ARG DEFAULT_OLLAMA_URL=http://mock-llm:8765/
ARG DEFAULT_OPENAI_URL=http://mock-llm:8765/v1
ARG NEXT_PUBLIC_DEFAULT_OLLAMA_URL=http://mock-llm:8765/
ARG NEXT_PUBLIC_DEFAULT_OPENAI_URL=http://mock-llm:8765/v1

# ----------------------------------------------------------------------
# Stage 1 — frontend static export (ADR-0004 output:"export")
# ----------------------------------------------------------------------
FROM node:22-alpine AS frontend-build
WORKDIR /app/frontend

# Layer-cache yarn install: copy only the lockfile + manifest first.
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --frozen-lockfile

# Now copy the rest of the frontend sources and build.
# The NEXT_PUBLIC_* env vars are inlined by the Next.js build (the
# frontend/out/ bundle has the values baked in).
COPY frontend/ ./
RUN yarn build

# ----------------------------------------------------------------------
# Stage 2 — backend wheel build (throwaway, Quick 260708-x22)
# ----------------------------------------------------------------------
# Produces /tmp/dist/epubtv-*.whl. The hatchling custom hook in
# backend/hatch_build.py copies the Stage-1 frontend dist into
# src/epubtv/www/ and writes src/epubtv/package.json with the
# prod defaults BEFORE the wheel is packaged. No other code in
# this stage is kept; the final image only consumes the wheel.
FROM python:3.13-slim AS backend-build

# uv binary (A4 path; the alternative is `pip install uv`).
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# hatchling is the build backend (declared in
# `[build-system] requires = ["hatchling"]`); install it so
# `uv build` can resolve the hatchling plugin.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --system hatchling

# Copy the backend project so the hatchling wheel build can
# resolve the package source. Mount the full backend/ tree (the
# hatch hook writes into src/epubtv/ at build time, so the
# whole project must be present).
WORKDIR /app
COPY backend/ /app/backend/

# Bring the Stage-1 frontend dist into the same path the
# `FRONTEND_OUT` env var points at. The hatch hook reads
# `FRONTEND_OUT` (default `../frontend/out`; here overridden to
# `/tmp/frontend-out`) and copies the dist into
# `src/epubtv/www/` at build time.
COPY --from=frontend-build /app/frontend/out /tmp/frontend-out

# Build the wheel. FRONTEND_OUT points at the Stage-1 output
# path; the hatch hook reads it and copies the dist into
# src/epubtv/www/. The wheel lands in /app/backend/dist/.
WORKDIR /app/backend
RUN --mount=type=cache,target=/root/.cache/uv \
    FRONTEND_OUT=/tmp/frontend-out \
    uv build --wheel --out-dir /tmp/dist

# ----------------------------------------------------------------------
# Stage 3 — backend runtime (REFACTORED final image)
# ----------------------------------------------------------------------
FROM python:3.13-slim AS backend

# Re-declare the buildtime ARG constants (Dockerfile ARGs go out
# of scope after a `FROM` — Stage 3 needs them again to pass them
# as ENV to the runtime container).
ARG DEFAULT_OLLAMA_URL=http://mock-llm:8765/
ARG DEFAULT_OPENAI_URL=http://mock-llm:8765/v1

# ffmpeg is required by pydub (Phase 3+ TTS pipeline).
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

# Pull the `uv` binary (used to create the runtime venv + install
# the wheel into it; per G4 the wheel install must NOT pollute
# the system Python).
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# The launcher script (Quick 260708-x22): runs the venv's python
# with `exec`, so uvicorn / mock-llm receive SIGTERM directly
# (the shell is replaced; the parent PID is the python process).
COPY backend/bin/run-in-venv.sh /usr/local/bin/run-in-venv.sh

# The wheel from Stage 2.
COPY --from=backend-build /tmp/dist/ /tmp/dist/

# Create the runtime venv + install the wheel + its declared
# runtime deps. The venv is at /app/.venv (matches the launcher
# script's VENV_DIR default + the compose service's healthcheck
# which uses `run-in-venv.sh` for the same venv resolution).
#
# `uv pip install --python /app/.venv/bin/python /tmp/dist/*.whl`
# reads the wheel's `Requires-Dist` metadata and installs every
# runtime dep into the venv — no separate `requirements.txt` step.
WORKDIR /app
RUN uv venv /app/.venv
# Quick 260709-54r: ``pydub`` (pulled in transitively by the wheel
# for the ``AudioStitcher`` port in the voiceover pipeline) tries to
# import the stdlib ``audioop`` module on Python 3.13+ — that module
# was removed in 3.13. pydub's fallback is to import ``pyaudioop``;
# the canonical replacement is the ``audioop-lts`` pure-Python
# backport. Without it, ``from pydub import AudioSegment`` raises
# ``ModuleNotFoundError`` at runtime, which silently kills the
# ``worker_supervisor`` task (the orchestrator is built lazily, so
# the lifespan startup succeeds but the first job dispatch dies
# with an unhandled task exception). The wheel's ``dependencies``
# list does NOT include ``audioop-lts`` (it is only in the ``mocks``
# dev extra), so we install it as a runtime dep in the image.
# ADR 0014 captures the rationale + the alternative we considered.
RUN uv pip install --python /app/.venv/bin/python /tmp/dist/*.whl

# Alembic config + migration scripts. The runtime
# `epubtv.tools.db_migrations.run_alembic_upgrade` resolves the
# config path as `Path(__file__).parents[3] / "alembic.ini"` —
# for a wheel-installed package under
# /app/.venv/lib/python3.13/site-packages/epubtv/tools/db_migrations.py,
# `parents[3]` is /app/.venv/lib/python3.13/. The alembic
# runtime expects the `alembic.ini` + `alembic/` to live in
# that exact directory (so `script_location = %(here)s/alembic`
# in alembic.ini resolves to the migrations tree). Stage 2's
# wheel does NOT bundle the alembic config (the wheel only
# contains the `epubtv/` package source — the migrations are a
# build-time concern, not runtime code), so we copy the files
# into the venv at the install path the runtime expects.
COPY backend/alembic.ini /app/.venv/lib/python3.13/alembic.ini
COPY backend/alembic/ /app/.venv/lib/python3.13/alembic/

# NLTK punkt_tab bake (Phase 1 plan 05 / D-06). Use the
# venv's python so the data lands in the venv's
# site-packages/nltk_data (the path that nltk searches at
# runtime). The script is idempotent (`nltk.data.find` guards
# the download), so re-builds are safe.
RUN /app/.venv/bin/python -m \
    epubtv.tools.bake_nltk

# Expose the buildtime constants to the runtime container. The
# backend's Pydantic Settings (config.py) reads `DEFAULT_OLLAMA_URL`
# + `DEFAULT_OPENAI_URL` via the `default_ollama_url` +
# `default_openai_url` fields (with AliasChoices fallback to
# `EPUBTV_DEFAULT_*` + the ARG name itself for back-compat).
ENV DEFAULT_OLLAMA_URL=$DEFAULT_OLLAMA_URL \
    DEFAULT_OPENAI_URL=$DEFAULT_OPENAI_URL \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Single-container runtime config:
#   EPUBTV_SERVE_STATIC=true    → FastAPI mounts StaticFiles from the wheel-bundled www/
#   EPUBTV_ENV=prod             → disables dev CORS (same-origin; T-03-01)
# EPUBTV_FRONTEND_OUT is intentionally NOT set here — the wheel's
# package.json carries {"frontend_out": "www"} and the G1
# resolver validator in `config.py` swaps that for the absolute
# install-tree path. Setting EPUBTV_FRONTEND_OUT in the env
# would bypass the resolver (env wins in pydantic-settings
# source precedence) and point StaticFiles at a path that does
# not exist in the runtime image (the venv-install location is
# the canonical one).
ENV EPUBTV_SERVE_STATIC=true \
    EPUBTV_ENV=prod \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# SQLite + scratch + audio + artifacts live on mounted volumes —
# image itself is read-only.
RUN mkdir -p /app/db /app/scratch /app/audio /app/artifacts

EXPOSE 8000

# `--workers 1` is MANDATORY (backend/AGENTS.md): multi-worker forks
# break the in-process job queue (F5 3-active-jobs semantics) and the
# SQLite WAL single-writer contract.
# The CMD uses the launcher so the venv's python (which has
# uvicorn + all the wheel's deps) is invoked — the system
# python on python:3.13-slim does NOT have uvicorn.
CMD ["run-in-venv.sh", "-m", "uvicorn", "epubtv.main:app", \
     "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
