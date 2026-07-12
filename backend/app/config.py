"""Application configuration, loaded from environment / .env via pydantic-settings."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings. Values come from environment variables or backend/.env."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "greenfield-api"
    environment: str = "development"

    # Async SQLAlchemy URL (must use the asyncpg driver).
    database_url: str = "postgresql+asyncpg://app:app@localhost:5432/app"

    # Comma-separated list of allowed CORS origins (the frontend dev server).
    cors_origins: str = "http://localhost:5173"

    # --- Authentication (slice 001-auth-email) ---------------------------------
    # Application secret for signing (reserved for OAuth state / token signing in
    # later slices). Opaque session tokens are random + DB-backed, so this is not
    # yet consumed at runtime; override it in every non-dev environment.
    session_secret: str = "dev-insecure-change-me"

    # Server-side session cookie. `Secure` is env-driven so local http dev works
    # while production still gets Secure=true (spec 001 Open question #2).
    session_cookie_name: str = "cadence_session"
    session_cookie_secure: bool = False
    # SameSite=None lets the MV3 extension popup ride the same session
    # (architecture §8.2); it mandates the CSRF double-submit below.
    session_cookie_samesite: Literal["lax", "strict", "none"] = "none"
    session_ttl_days: int = 30

    # CSRF double-submit token: a JS-readable cookie echoed back in a header on
    # every mutating request (architecture §8.2 / gap G-3).
    csrf_cookie_name: str = "cadence_csrf"
    csrf_header_name: str = "X-CSRF-Token"

    # bcrypt work factor for password hashing (NFR-SEC-01, architecture §8.1).
    bcrypt_rounds: int = 12

    # --- AI coach (slice 006-coach) --------------------------------------------
    # Google AI Studio API key for the Gemma coach (TC-LLM-01). Optional so the app
    # never crashes when it is absent (NFR-REL-01): with no key configured the coach
    # degrades gracefully to its deterministic fallback. Read ONLY here via
    # pydantic-settings (maps env GOOGLE_AI_API_KEY); never hardcode, log, or print it
    # (TC-STACK-02). backend/.env is git-ignored — only the placeholder in
    # .env.example is committed.
    google_ai_api_key: str | None = None

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance."""
    return Settings()
