"""Application configuration (Pydantic Settings).

Resolves environment-driven wiring locked by CONTEXT D-03 + RESEARCH §Open Q4:
- ``EPUBTV_ENV``: ``"dev"`` (default; permissive CORS) or ``"prod"`` (no CORS,
  StaticFiles mount is same-origin).
- ``EPUBTV_DB_PATH``: SQLite database path (default ``./db/epubtv.db``).
- ``EPUBTV_SCRATCH_DIR``: scratch directory for uploaded / generated artifacts.
- ``EPUBTV_MAX_EPUB_BYTES``: hard upload cap (F1 50 MB default).
- ``EPUBTV_SERVE_STATIC``: prod path — mount the built SPA export at ``/``.
- ``EPUBTV_FRONTEND_OUT``: directory of the built SPA export (Next.js ``out/``).
- ``EPUBTV_CORS_ORIGINS``: opt-in CORS origin override (CSV).
- ``EPUBTV_WORKER_MAX_ACTIVE``: parallel in-process worker count (D-02, default 1).
- ``EPUBTV_BAKE_NLTK``: when ``"1"``, the ``SentenceChunker`` module triggers
  the NLTK data bake at import time (D-01 + Open Q 10). Off in tests so
  unit tests do NOT trigger a network download.

The ``settings`` singleton is the import-time instance; tests override fields
per-fixture rather than re-reading env (see ``tests/conftest.py``).
"""

from __future__ import annotations

import json
import logging
import os
from importlib.resources import files
from pathlib import Path
from typing import Any, Literal

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def package_json_settings() -> dict[str, Any]:
    """Read the wheel-internal ``epubtv/package.json`` if present.

    Quick 260708-x22: the hatch build hook writes a prod-defaults
    JSON next to the package code so the runtime container can
    discover the production `frontend_out` + `serve_static` + `env`
    values without env-var wiring. The file is bundled into the
    wheel; when the package is installed in a venv (the production
    path) `importlib.resources.files("epubtv")` resolves the
    site-packages install location and the JSON is readable.

    Returns ``{}`` when the package is running in editable-install
    mode (no wheel was built) or the file is otherwise missing —
    the Settings model uses field defaults in that case.

    Source precedence (pydantic-settings env-source wins):
        env vars > dotenv > package.json > field defaults
    """
    try:
        path = files("epubtv").joinpath("package.json")
        return json.loads(path.read_text("utf-8"))
    except (FileNotFoundError, ModuleNotFoundError, OSError):
        return {}


class Settings(BaseSettings):
    """Runtime configuration for the EPUB Translator & Voice-Over backend.

    All field defaults encode the demo / sprint path; production wiring
    is via environment variables (D-03).
    """

    model_config = SettingsConfigDict(
        env_prefix="EPUBTV_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: type[BaseSettings],
        init_settings: Any,
        env_settings: Any,
        dotenv_settings: Any,
        file_secret_settings: Any,
    ) -> tuple[Any, ...]:
        """Insert ``package_json_settings`` between dotenv + file-secret sources.

        Quick 260708-x22: the source order determines precedence —
        earlier sources win. ``package_json_settings`` reads the
        wheel-internal ``epubtv/package.json`` (written by the
        hatch build hook at wheel-build time) and supplies prod
        defaults. Env vars still win; dotenv still wins; the
        package.json is the canonical "what does prod look like
        without env wiring" source.
        """
        return (
            init_settings,
            env_settings,
            dotenv_settings,
            package_json_settings,
            file_secret_settings,
        )

    # Database -----------------------------------------------------------------
    db_path: Path = Path("./db/epubtv.db")

    # Scratch storage ----------------------------------------------------------
    scratch_dir: Path = Path("./scratch")

    # F1 upload cap (50 MB, off-by-one audited per Pitfall D) ------------------
    max_epub_bytes: int = 50 * 1024 * 1024

    # Static SPA serving (D-03 prod path) -------------------------------------
    serve_static: bool = False
    frontend_out: Path = Path("../frontend/out")

    # Environment selector (Open Q4 RESOLVED: D-03 env-gated CORS) ------------
    env: Literal["dev", "prod"] = "dev"

    # Optional CORS override (CSV). When ``None`` the env selector decides
    # (``dev`` → ``["*"]``; ``prod`` → no CORS middleware). Setting this to a
    # CSV list overrides both defaults.
    cors_origins: list[str] | None = None

    # Worker queue ``MAX_ACTIVE`` (D-02). Sprint default is 1; the
    # post-sprint hardening pass raises this to 3 via env. Consumed by
    # the worker drain loop wired in plan 02-02.
    #
    # Env alias: ``WORKER_MAX_ACTIVE`` (no ``EPUBTV_`` prefix — matches
    # the D-02 + plan 02-02 contract verbatim). The pydantic-settings
    # ``env_prefix="EPUBTV_"`` would otherwise expose this only via
    # ``EPUBTV_WORKER_MAX_ACTIVE``; the ``AliasChoices`` lets BOTH work
    # so unit tests + the field's primary name stay stable.
    worker_max_active: int = Field(
        default=1,
        validation_alias=AliasChoices(
            "worker_max_active",
            "EPUBTV_WORKER_MAX_ACTIVE",
            "WORKER_MAX_ACTIVE",
        ),
    )

    # When True, the ``SentenceChunker`` module triggers the NLTK
    # ``punkt`` + ``punkt_tab`` bake at import time (D-01 + Open Q 10).
    # Default ``False`` so unit tests do NOT trigger a network download;
    # production containers and CI runners set ``EPUBTV_BAKE_NLTK=1``.
    bake_nltk: bool = False

    # Per-chapter audio output directory (Phase 3 / D-13). The
    # ``VoiceOverWorkflowService`` writes ``ch{N}.wav`` under
    # ``{audio_dir}/{job_id}/``; the F6 download endpoint (Phase 4)
    # reads the same path. The default is a relative path under CWD;
    # production overrides via env or settings file.
    audio_dir: Path = Path("data/audio")

    # Phase 4 / DL-01: artifact pre-build directory. The
    # ``TranslationWorkflowService`` writes ``translated.epub`` and
    # the ``VoiceOverWorkflowService`` writes ``audio.zip`` under
    # ``{artifact_dir}/{job_id}/`` at job completion. The F6
    # download endpoint resolves the same path. The default is
    # a relative path under CWD; production overrides via env or
    # settings file (mirrors the ``audio_dir`` shape).
    artifact_dir: Path = Path("data/artifacts")

    # Phase 1 plan 05 / D-06: buildtime default URL constants for
    # the translation + TTS provider Base URL fields. The Dockerfile
    # wires ``ARG DEFAULT_OLLAMA_URL`` + ``ARG DEFAULT_OPENAI_URL``
    # (mock-friendly defaults; see Dockerfile header comment). The
    # SPA's ``lib/buildtimeDefaults.ts`` reads the same values via
    # ``NEXT_PUBLIC_DEFAULT_OLLAMA_URL`` + ``NEXT_PUBLIC_DEFAULT_OPENAI_URL``
    # (separate env vars, inlined at static-export build time).
    #
    # The env-var fallback chain mirrors the ``worker_max_active``
    # pattern (lines above): ``AliasChoices`` accepts the
    # ``default_ollama_url`` field name + the uppercase
    # ``EPUBTV_DEFAULT_OLLAMA_URL`` + the bare ``DEFAULT_OLLAMA_URL``
    # that the Dockerfile writes as ``ENV`` (the Dockerfile's ENV
    # value is what the runtime container sees).
    default_ollama_url: str = Field(
        default="http://localhost:11434/",
        validation_alias=AliasChoices(
            "default_ollama_url",
            "EPUBTV_DEFAULT_OLLAMA_URL",
            "DEFAULT_OLLAMA_URL",
        ),
    )
    default_openai_url: str = Field(
        default="https://api.openai.com/v1",
        validation_alias=AliasChoices(
            "default_openai_url",
            "EPUBTV_DEFAULT_OPENAI_URL",
            "DEFAULT_OPENAI_URL",
        ),
    )

    # Phase 1 plan 01: per-provider default MODEL constants for the
    # translation + TTS adapters. The Dockerfile wires
    # ``ARG DEFAULT_OLLAMA_MODEL`` / ``ARG DEFAULT_OPENAI_MODEL`` /
    # ``ARG DEFAULT_TTS_MODEL`` (mock-friendly sprint defaults; see
    # Dockerfile header comment). The SPA's
    # ``lib/buildtimeDefaults.ts`` reads the same values via separate
    # ``NEXT_PUBLIC_*`` env vars (inlined at static-export build time).
    #
    # The AliasChoices pattern matches ``default_ollama_url`` /
    # ``default_openai_url`` (lines above) so the field name +
    # ``EPUBTV_DEFAULT_*_MODEL`` + the bare ``DEFAULT_*_MODEL`` that
    # the Dockerfile writes as ``ENV`` all resolve to the same field.
    # The orchestrator overrides these lifespan defaults from the job
    # row's ``model`` column at dispatch time (see
    # ``application/job_orchestrator.py``); these are the fallback
    # when the job row has no model set (legacy NULL rows).
    default_ollama_model: str = Field(
        default="translategemma:12b",
        validation_alias=AliasChoices(
            "default_ollama_model",
            "EPUBTV_DEFAULT_OLLAMA_MODEL",
            "DEFAULT_OLLAMA_MODEL",
        ),
    )
    default_openai_model: str = Field(
        default="gpt-4o-mini",
        validation_alias=AliasChoices(
            "default_openai_model",
            "EPUBTV_DEFAULT_OPENAI_MODEL",
            "DEFAULT_OPENAI_MODEL",
        ),
    )
    default_tts_model: str = Field(
        default="tts-1",
        validation_alias=AliasChoices(
            "default_tts_model",
            "EPUBTV_DEFAULT_TTS_MODEL",
            "DEFAULT_TTS_MODEL",
        ),
    )

    host: str = Field(
        default="127.0.0.1",
    )
    port: int = Field(
        default=8000,
    )
    log_level: Literal["DEBUG", "INFO", "WARN", "ERROR"] = Field(default="INFO")

    def resolve_log_level(self) -> int:
        return getattr(logging, self.log_level.upper(), logging.INFO)

    def effective_cors_origins(self) -> list[str] | None:
        """Return CORS origins to apply, or None to skip CORS middleware.

        - ``prod`` → ``None`` unless an explicit override is supplied (the
          StaticFiles mount is same-origin, no CORS needed).
        - ``dev`` → ``settings.cors_origins or ["*"]`` (permissive).
        """
        if self.env == "prod":
            return self.cors_origins  # explicit override only; else no CORS
        # dev
        return self.cors_origins if self.cors_origins is not None else ["*"]

    @model_validator(mode="after")
    def _resolve_frontend_out(self) -> Settings:
        """Resolve the ``"www"`` marker to the install-tree path (G1).

        Quick 260708-x22 G1: the hatch build hook writes the
        package.json with ``"frontend_out": "www"`` (a relative
        marker so the JSON is portable between dev + prod). At
        runtime, the actual install location of the ``www/``
        resource is ``importlib.resources.files("epubtv") / "www"``,
        which is the absolute path inside the venv's site-packages.

        This validator swaps the relative string for the absolute
        install-tree path when ALL of the following hold:
            1. ``frontend_out == Path("www")`` (the marker).
            2. The package has a ``www/`` resource (proves the
               wheel was installed via venv; in editable-install
               mode or the unit-test env, the resource is absent
               and the validator is a no-op).
            3. The field was NOT set by an env var / dotenv /
               init kwargs (env-source precedence makes the
               env-var value authoritative regardless of this
               resolver).

        Env-var overrides for ``EPUBTV_FRONTEND_OUT`` pass
        through ``pydantic-settings`` env-source BEFORE this
        validator runs; the env value replaces the ``www``
        marker with the explicit path, and the validator's
        ``==`` check fails (env wins).
        """
        if self.frontend_out != Path("www"):
            return self
        try:
            www_resource = files("epubtv") / "www"
        except (ModuleNotFoundError, FileNotFoundError):
            return self
        # ``www_resource`` is an ``importlib.resources.Traversable`` —
        # coerce to a concrete ``Path`` so downstream code (FastAPI
        # ``StaticFiles(directory=...)``) accepts it. ``os.fspath``
        # returns the install-tree absolute path; ``Path(...)``
        # ensures the type is the field-declared ``Path``.
        www_path = Path(os.fspath(www_resource))
        if not www_path.is_dir():
            return self
        # Swap to the absolute install-tree path. Use
        # ``object.__setattr__`` to bypass any future
        # ``frozen=True`` model_config.
        object.__setattr__(self, "frontend_out", www_path)
        return self


settings = Settings()
