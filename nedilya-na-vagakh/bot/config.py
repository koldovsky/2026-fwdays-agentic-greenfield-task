from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


class ConfigError(ValueError):
    """Raised when required configuration is missing or invalid."""


DEFAULT_DATABASE_PATH = "./data/bot.db"
_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


@dataclass(frozen=True)
class Config:
    bot_token: str
    allowed_user_ids: frozenset[int]
    database_path: str


def _parse_allowed_user_ids(raw: str) -> frozenset[int]:
    if not raw.strip():
        raise ConfigError("ALLOWED_USER_IDS is required and must not be empty")

    ids: set[int] = set()
    for part in raw.split(","):
        token = part.strip()
        if not token:
            continue
        try:
            ids.add(int(token))
        except ValueError as exc:
            raise ConfigError(
                f"ALLOWED_USER_IDS contains invalid value: {token!r}"
            ) from exc

    if not ids:
        raise ConfigError("ALLOWED_USER_IDS must contain at least one user ID")

    return frozenset(ids)


def load_config(environ: dict[str, str] | None = None) -> Config:
    if environ is None:
        from dotenv import load_dotenv

        load_dotenv(_ENV_FILE)

    env = os.environ if environ is None else environ

    bot_token = env.get("BOT_TOKEN", "").strip()
    if not bot_token:
        raise ConfigError("BOT_TOKEN is required")

    allowed_raw = env.get("ALLOWED_USER_IDS", "")
    allowed_user_ids = _parse_allowed_user_ids(allowed_raw)

    database_path = env.get("DATABASE_PATH", DEFAULT_DATABASE_PATH).strip()
    if not database_path:
        database_path = DEFAULT_DATABASE_PATH

    return Config(
        bot_token=bot_token,
        allowed_user_ids=allowed_user_ids,
        database_path=database_path,
    )
