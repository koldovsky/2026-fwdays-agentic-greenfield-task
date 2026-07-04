from pathlib import Path

from bot.db import connect, init_schema
from bot.repository import (
    DEFAULT_DISPLAY_NAME,
    DEFAULT_REMINDER_TIME,
    DEFAULT_REMINDER_TIMEZONE,
    DEFAULT_REMINDER_WEEKDAY,
    complete_onboarding,
    count_weigh_ins,
    delete_latest_weigh_in,
    get_first_weigh_in,
    get_latest_weigh_in,
    get_or_create_settings,
    insert_weigh_in,
    list_weigh_ins_asc,
    list_weigh_ins_desc,
    update_display_name,
    update_reminder_time,
)


def test_schema_creates_tables():
    conn = connect(":memory:")
    init_schema(conn)

    tables = {
        row[0]
        for row in conn.execute("SELECT name FROM sqlite_master WHERE type = 'table'")
    }
    assert "user_settings" in tables
    assert "weigh_ins" in tables
    conn.close()


def test_get_or_create_settings_defaults():
    conn = connect(":memory:")
    init_schema(conn)

    settings = get_or_create_settings(conn, telegram_user_id=42)

    assert settings.telegram_user_id == 42
    assert settings.display_name == DEFAULT_DISPLAY_NAME
    assert settings.reminder_time == DEFAULT_REMINDER_TIME
    assert settings.reminder_timezone == DEFAULT_REMINDER_TIMEZONE
    assert settings.reminder_weekday == DEFAULT_REMINDER_WEEKDAY
    assert settings.setup_completed_at is None
    conn.close()


def test_insert_and_fetch_weigh_in():
    conn = connect(":memory:")
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)

    inserted = insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=72.4,
        fat_pct=28.5,
        muscle_pct=32.1,
        bmi=24.8,
        recorded_at="2026-07-01T09:00:00+00:00",
    )
    latest = get_latest_weigh_in(conn, user_id=42)

    assert latest is not None
    assert latest.id == inserted.id
    assert latest.weight_kg == 72.4
    assert latest.fat_pct == 28.5
    assert latest.muscle_pct == 32.1
    assert latest.bmi == 24.8
    conn.close()


def test_data_survives_restart_simulation(tmp_path: Path):
    db_path = str(tmp_path / "bot.db")

    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=7)
    insert_weigh_in(
        conn,
        user_id=7,
        weight_kg=70.0,
        fat_pct=27.0,
        muscle_pct=33.0,
        bmi=24.0,
        recorded_at="2026-06-01T09:00:00+00:00",
    )
    conn.close()

    reopened = connect(db_path)
    latest = get_latest_weigh_in(reopened, user_id=7)

    assert latest is not None
    assert latest.weight_kg == 70.0
    reopened.close()


def test_delete_latest_weigh_in_removes_newest():
    conn = connect(":memory:")
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)

    insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=70.0,
        fat_pct=27.0,
        muscle_pct=33.0,
        bmi=24.0,
        recorded_at="2026-06-01T09:00:00+00:00",
    )
    second = insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=69.0,
        fat_pct=26.0,
        muscle_pct=34.0,
        bmi=23.5,
        recorded_at="2026-07-01T09:00:00+00:00",
    )

    deleted = delete_latest_weigh_in(conn, user_id=42)
    latest = get_latest_weigh_in(conn, user_id=42)

    assert deleted is not None
    assert deleted.id == second.id
    assert latest is not None
    assert latest.weight_kg == 70.0
    conn.close()


def test_delete_latest_weigh_in_when_empty():
    conn = connect(":memory:")
    init_schema(conn)

    deleted = delete_latest_weigh_in(conn, user_id=99)

    assert deleted is None
    conn.close()


def test_get_first_weigh_in_returns_earliest():
    conn = connect(":memory:")
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)

    insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=70.0,
        fat_pct=27.0,
        muscle_pct=33.0,
        bmi=24.0,
        recorded_at="2026-06-01T09:00:00+00:00",
    )
    insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=69.0,
        fat_pct=26.0,
        muscle_pct=34.0,
        bmi=23.5,
        recorded_at="2026-07-01T09:00:00+00:00",
    )

    first = get_first_weigh_in(conn, user_id=42)

    assert first is not None
    assert first.weight_kg == 70.0
    conn.close()


def test_get_first_weigh_in_when_empty():
    conn = connect(":memory:")
    init_schema(conn)

    assert get_first_weigh_in(conn, user_id=99) is None
    conn.close()


def test_list_weigh_ins_desc_returns_newest_first():
    conn = connect(":memory:")
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)

    insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=70.0,
        fat_pct=27.0,
        muscle_pct=33.0,
        bmi=24.0,
        recorded_at="2026-06-01T09:00:00+00:00",
    )
    insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=69.0,
        fat_pct=26.0,
        muscle_pct=34.0,
        bmi=23.5,
        recorded_at="2026-07-01T09:00:00+00:00",
    )
    insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=68.5,
        fat_pct=25.5,
        muscle_pct=34.5,
        bmi=23.0,
        recorded_at="2026-08-01T09:00:00+00:00",
    )

    recent = list_weigh_ins_desc(conn, user_id=42, limit=2)

    assert len(recent) == 2
    assert recent[0].weight_kg == 68.5
    assert recent[1].weight_kg == 69.0
    conn.close()


def test_list_weigh_ins_desc_fewer_than_limit():
    conn = connect(":memory:")
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=72.4,
        fat_pct=28.5,
        muscle_pct=32.1,
        bmi=24.8,
        recorded_at="2026-07-01T09:00:00+00:00",
    )

    recent = list_weigh_ins_desc(conn, user_id=42, limit=2)

    assert len(recent) == 1
    assert recent[0].weight_kg == 72.4
    conn.close()


def test_list_weigh_ins_asc_returns_oldest_first():
    conn = connect(":memory:")
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)

    insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=70.0,
        fat_pct=27.0,
        muscle_pct=33.0,
        bmi=24.0,
        recorded_at="2026-06-01T09:00:00+00:00",
    )
    insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=69.0,
        fat_pct=26.0,
        muscle_pct=34.0,
        bmi=23.5,
        recorded_at="2026-07-01T09:00:00+00:00",
    )

    entries = list_weigh_ins_asc(conn, user_id=42)

    assert len(entries) == 2
    assert entries[0].weight_kg == 70.0
    assert entries[1].weight_kg == 69.0
    conn.close()


def test_count_weigh_ins():
    conn = connect(":memory:")
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)

    assert count_weigh_ins(conn, user_id=42) == 0

    insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=72.4,
        fat_pct=28.5,
        muscle_pct=32.1,
        bmi=24.8,
        recorded_at="2026-07-01T09:00:00+00:00",
    )

    assert count_weigh_ins(conn, user_id=42) == 1
    conn.close()


def test_update_display_name_persists_new_value():
    conn = connect(":memory:")
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)

    updated = update_display_name(conn, telegram_user_id=42, display_name="Марія")

    assert updated.display_name == "Марія"
    refreshed = get_or_create_settings(conn, telegram_user_id=42)
    assert refreshed.display_name == "Марія"
    conn.close()


def test_update_display_name_can_clear_to_null():
    conn = connect(":memory:")
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)

    updated = update_display_name(conn, telegram_user_id=42, display_name=None)

    assert updated.display_name is None
    refreshed = get_or_create_settings(conn, telegram_user_id=42)
    assert refreshed.display_name is None
    conn.close()


def test_update_reminder_time_persists_new_value():
    conn = connect(":memory:")
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)

    updated = update_reminder_time(conn, telegram_user_id=42, reminder_time="10:30")

    assert updated.reminder_time == "10:30"
    refreshed = get_or_create_settings(conn, telegram_user_id=42)
    assert refreshed.reminder_time == "10:30"
    assert refreshed.reminder_timezone == DEFAULT_REMINDER_TIMEZONE
    conn.close()


def test_complete_onboarding_sets_defaults_and_timestamp():
    conn = connect(":memory:")
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)

    completed = complete_onboarding(
        conn,
        telegram_user_id=42,
        reminder_time="08:30",
        completed_at="2026-07-03T07:00:00+00:00",
    )

    assert completed.display_name == DEFAULT_DISPLAY_NAME
    assert completed.reminder_time == "08:30"
    assert completed.reminder_timezone == DEFAULT_REMINDER_TIMEZONE
    assert completed.setup_completed_at == "2026-07-03T07:00:00+00:00"

    refreshed = get_or_create_settings(conn, telegram_user_id=42)
    assert refreshed.setup_completed_at == "2026-07-03T07:00:00+00:00"
    conn.close()
