from __future__ import annotations

import sqlite3
from datetime import UTC, datetime

from bot.models import UserSettings, WeighIn

DEFAULT_DISPLAY_NAME = "Оленка"
DEFAULT_REMINDER_TIME = "09:00"
DEFAULT_REMINDER_TIMEZONE = "Europe/Kyiv"
DEFAULT_REMINDER_WEEKDAY = 6


class RepositoryError(RuntimeError):
    """Raised when a repository operation does not persist as expected."""


def _row_to_settings(row: sqlite3.Row) -> UserSettings:
    return UserSettings(
        telegram_user_id=row["telegram_user_id"],
        display_name=row["display_name"],
        reminder_time=row["reminder_time"],
        reminder_timezone=row["reminder_timezone"],
        reminder_weekday=row["reminder_weekday"],
        setup_completed_at=row["setup_completed_at"],
    )


def _row_to_weigh_in(row: sqlite3.Row) -> WeighIn:
    return WeighIn(
        id=row["id"],
        user_id=row["user_id"],
        recorded_at=row["recorded_at"],
        weight_kg=row["weight_kg"],
        fat_pct=row["fat_pct"],
        muscle_pct=row["muscle_pct"],
        bmi=row["bmi"],
    )


def get_or_create_settings(
    conn: sqlite3.Connection, telegram_user_id: int
) -> UserSettings:
    row = conn.execute(
        "SELECT * FROM user_settings WHERE telegram_user_id = ?",
        (telegram_user_id,),
    ).fetchone()

    if row is not None:
        return _row_to_settings(row)

    conn.execute(
        """
        INSERT INTO user_settings (
            telegram_user_id,
            display_name,
            reminder_time,
            reminder_timezone,
            reminder_weekday
        ) VALUES (?, ?, ?, ?, ?)
        """,
        (
            telegram_user_id,
            DEFAULT_DISPLAY_NAME,
            DEFAULT_REMINDER_TIME,
            DEFAULT_REMINDER_TIMEZONE,
            DEFAULT_REMINDER_WEEKDAY,
        ),
    )
    conn.commit()

    created = conn.execute(
        "SELECT * FROM user_settings WHERE telegram_user_id = ?",
        (telegram_user_id,),
    ).fetchone()
    if created is None:
        raise RepositoryError(
            f"user_settings row missing after insert for user {telegram_user_id}"
        )
    return _row_to_settings(created)


def insert_weigh_in(
    conn: sqlite3.Connection,
    user_id: int,
    weight_kg: float,
    fat_pct: float,
    muscle_pct: float,
    bmi: float,
    recorded_at: str | None = None,
) -> WeighIn:
    timestamp = recorded_at or datetime.now(UTC).isoformat()
    cursor = conn.execute(
        """
        INSERT INTO weigh_ins (
            user_id, recorded_at, weight_kg, fat_pct, muscle_pct, bmi
        ) VALUES (?, ?, ?, ?, ?, ?)
        """,
        (user_id, timestamp, weight_kg, fat_pct, muscle_pct, bmi),
    )
    conn.commit()

    if cursor.lastrowid is None:
        raise RepositoryError("weigh-in insert did not return a row id")

    row = conn.execute(
        "SELECT * FROM weigh_ins WHERE id = ?",
        (cursor.lastrowid,),
    ).fetchone()
    if row is None:
        raise RepositoryError(
            f"weigh-in row missing after insert (id={cursor.lastrowid})"
        )
    return _row_to_weigh_in(row)


def get_latest_weigh_in(conn: sqlite3.Connection, user_id: int) -> WeighIn | None:
    row = conn.execute(
        """
        SELECT * FROM weigh_ins
        WHERE user_id = ?
        ORDER BY recorded_at DESC, id DESC
        LIMIT 1
        """,
        (user_id,),
    ).fetchone()

    if row is None:
        return None
    return _row_to_weigh_in(row)


def delete_latest_weigh_in(conn: sqlite3.Connection, user_id: int) -> WeighIn | None:
    latest = get_latest_weigh_in(conn, user_id)
    if latest is None:
        return None

    conn.execute("DELETE FROM weigh_ins WHERE id = ?", (latest.id,))
    conn.commit()
    return latest


def get_first_weigh_in(conn: sqlite3.Connection, user_id: int) -> WeighIn | None:
    row = conn.execute(
        """
        SELECT * FROM weigh_ins
        WHERE user_id = ?
        ORDER BY recorded_at ASC, id ASC
        LIMIT 1
        """,
        (user_id,),
    ).fetchone()

    if row is None:
        return None
    return _row_to_weigh_in(row)


def list_weigh_ins_desc(
    conn: sqlite3.Connection, user_id: int, *, limit: int
) -> list[WeighIn]:
    rows = conn.execute(
        """
        SELECT * FROM weigh_ins
        WHERE user_id = ?
        ORDER BY recorded_at DESC, id DESC
        LIMIT ?
        """,
        (user_id, limit),
    ).fetchall()
    return [_row_to_weigh_in(row) for row in rows]


def list_weigh_ins_asc(conn: sqlite3.Connection, user_id: int) -> list[WeighIn]:
    rows = conn.execute(
        """
        SELECT * FROM weigh_ins
        WHERE user_id = ?
        ORDER BY recorded_at ASC, id ASC
        """,
        (user_id,),
    ).fetchall()
    return [_row_to_weigh_in(row) for row in rows]


def count_weigh_ins(conn: sqlite3.Connection, user_id: int) -> int:
    row = conn.execute(
        "SELECT COUNT(*) AS count FROM weigh_ins WHERE user_id = ?",
        (user_id,),
    ).fetchone()
    if row is None:
        return 0
    return int(row["count"])


def update_display_name(
    conn: sqlite3.Connection, telegram_user_id: int, display_name: str | None
) -> UserSettings:
    get_or_create_settings(conn, telegram_user_id)
    conn.execute(
        "UPDATE user_settings SET display_name = ? WHERE telegram_user_id = ?",
        (display_name, telegram_user_id),
    )
    conn.commit()

    row = conn.execute(
        "SELECT * FROM user_settings WHERE telegram_user_id = ?",
        (telegram_user_id,),
    ).fetchone()
    if row is None:
        raise RepositoryError(
            f"user_settings row missing after update for user {telegram_user_id}"
        )
    return _row_to_settings(row)


def update_reminder_time(
    conn: sqlite3.Connection, telegram_user_id: int, reminder_time: str
) -> UserSettings:
    get_or_create_settings(conn, telegram_user_id)
    conn.execute(
        "UPDATE user_settings SET reminder_time = ? WHERE telegram_user_id = ?",
        (reminder_time, telegram_user_id),
    )
    conn.commit()

    row = conn.execute(
        "SELECT * FROM user_settings WHERE telegram_user_id = ?",
        (telegram_user_id,),
    ).fetchone()
    if row is None:
        raise RepositoryError(
            f"user_settings row missing after update for user {telegram_user_id}"
        )
    return _row_to_settings(row)


def list_completed_user_settings(conn: sqlite3.Connection) -> list[UserSettings]:
    rows = conn.execute(
        "SELECT * FROM user_settings WHERE setup_completed_at IS NOT NULL"
    ).fetchall()
    return [_row_to_settings(row) for row in rows]


def complete_onboarding(
    conn: sqlite3.Connection,
    telegram_user_id: int,
    *,
    reminder_time: str,
    display_name: str = DEFAULT_DISPLAY_NAME,
    completed_at: str | None = None,
) -> UserSettings:
    get_or_create_settings(conn, telegram_user_id)
    timestamp = completed_at or datetime.now(UTC).isoformat()
    conn.execute(
        """
        UPDATE user_settings
        SET reminder_time = ?, display_name = ?, setup_completed_at = ?
        WHERE telegram_user_id = ?
        """,
        (reminder_time, display_name, timestamp, telegram_user_id),
    )
    conn.commit()

    row = conn.execute(
        "SELECT * FROM user_settings WHERE telegram_user_id = ?",
        (telegram_user_id,),
    ).fetchone()
    if row is None:
        raise RepositoryError(
            f"user_settings row missing after onboarding for user {telegram_user_id}"
        )
    return _row_to_settings(row)
