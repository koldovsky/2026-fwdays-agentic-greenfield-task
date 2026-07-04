from __future__ import annotations

import sqlite3
from pathlib import Path

USER_SETTINGS_SCHEMA = """
CREATE TABLE IF NOT EXISTS user_settings (
    telegram_user_id INTEGER PRIMARY KEY,
    display_name TEXT,
    reminder_time TEXT NOT NULL DEFAULT '09:00',
    reminder_timezone TEXT NOT NULL DEFAULT 'Europe/Kyiv',
    reminder_weekday INTEGER NOT NULL DEFAULT 6,
    setup_completed_at TEXT
);
"""

WEIGH_INS_SCHEMA = """
CREATE TABLE IF NOT EXISTS weigh_ins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    recorded_at TEXT NOT NULL,
    weight_kg REAL NOT NULL,
    fat_pct REAL NOT NULL,
    muscle_pct REAL NOT NULL,
    bmi REAL NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user_settings (telegram_user_id)
);
"""


def connect(database_path: str) -> sqlite3.Connection:
    path = Path(database_path)
    if path != Path(":memory:"):
        path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(USER_SETTINGS_SCHEMA + WEIGH_INS_SCHEMA)
    conn.commit()
