"""Password hashing and opaque-token generation.

Pure and framework-free (architecture §1 / §9): no FastAPI, no SQLAlchemy, no I/O
at import time. bcrypt cost is config-driven (NFR-SEC-01, architecture §8.1); the
CryptContext is built lazily on first use so importing this module reads nothing.
"""

import secrets
from functools import lru_cache

from passlib.context import CryptContext

from app.config import get_settings

# 32 bytes = 256 bits of entropy for the opaque session token (architecture §8.2)
# and the CSRF double-submit token. token_urlsafe yields ~43 URL-safe characters.
_TOKEN_BYTES = 32


@lru_cache
def _pwd_context() -> CryptContext:
    """bcrypt CryptContext at the configured work factor (built once, on demand)."""
    return CryptContext(
        schemes=["bcrypt"],
        deprecated="auto",
        bcrypt__rounds=get_settings().bcrypt_rounds,
    )


@lru_cache
def _dummy_hash() -> str:
    """A throwaway bcrypt hash used to equalize login timing (see ``fake_verify``)."""
    return _pwd_context().hash("cadence-timing-equalizer")


def hash_password(plain: str) -> str:
    """Return a salted bcrypt hash of ``plain`` (per-hash random salt, cost 12)."""
    return _pwd_context().hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True iff ``plain`` matches the stored bcrypt ``hashed`` value."""
    return _pwd_context().verify(plain, hashed)


def fake_verify() -> None:
    """Run a bcrypt verify against a throwaway hash.

    Called on the "no such user" login path so an attacker cannot distinguish a
    missing account from a wrong password by timing (user-enumeration defense).
    """
    _pwd_context().verify("cadence-timing-equalizer-wrong", _dummy_hash())


def generate_session_token() -> str:
    """Return a new opaque 256-bit URL-safe session token."""
    return secrets.token_urlsafe(_TOKEN_BYTES)


def generate_csrf_token() -> str:
    """Return a new opaque 256-bit URL-safe CSRF double-submit token."""
    return secrets.token_urlsafe(_TOKEN_BYTES)
