from datetime import time
from unittest.mock import AsyncMock, MagicMock
from zoneinfo import ZoneInfo

import pytest

from bot.models import UserSettings
from bot.reminder_scheduler import (
    python_weekday_to_job_days,
    reminder_job_name,
    reminder_time_to_components,
    schedule_all_reminders,
    schedule_user_reminder,
    schedule_user_reminder_if_eligible,
    send_sunday_reminder,
)
from bot.repository import complete_onboarding, get_or_create_settings


def test_reminder_time_to_components_zero_pads_from_db_value():
    assert reminder_time_to_components("09:00") == (9, 0)
    assert reminder_time_to_components("9:00") == (9, 0)


def test_python_weekday_to_job_days_maps_sunday():
    assert python_weekday_to_job_days(6) == (0,)


def test_reminder_job_name_is_stable():
    assert reminder_job_name(42) == "sunday_reminder_42"


def test_schedule_user_reminder_registers_daily_job():
    job_queue = MagicMock()
    job_queue.get_jobs_by_name.return_value = []
    settings = UserSettings(
        telegram_user_id=42,
        display_name="Оленка",
        reminder_time="10:30",
        reminder_timezone="Europe/Kyiv",
        reminder_weekday=6,
        setup_completed_at="2026-07-01T09:00:00+00:00",
    )

    schedule_user_reminder(job_queue, settings)

    job_queue.get_jobs_by_name.assert_called_once_with("sunday_reminder_42")
    job_queue.run_daily.assert_called_once()
    _, kwargs = job_queue.run_daily.call_args
    assert kwargs["name"] == "sunday_reminder_42"
    assert kwargs["data"] == 42
    assert kwargs["days"] == (0,)
    scheduled_time = kwargs["time"]
    assert scheduled_time == time(10, 30, tzinfo=ZoneInfo("Europe/Kyiv"))


def test_schedule_user_reminder_if_eligible_skips_incomplete_setup():
    job_queue = MagicMock()
    settings = UserSettings(
        telegram_user_id=42,
        display_name=None,
        reminder_time="09:00",
        reminder_timezone="Europe/Kyiv",
        reminder_weekday=6,
        setup_completed_at=None,
    )

    schedule_user_reminder_if_eligible(job_queue, settings)

    job_queue.run_daily.assert_not_called()


def test_schedule_all_reminders_only_schedules_completed_allowlisted_users(tmp_path):
    db_path = tmp_path / "bot.db"
    conn = __import__("bot.db", fromlist=["connect"]).connect(str(db_path))
    __import__("bot.db", fromlist=["init_schema"]).init_schema(conn)
    complete_onboarding(conn, telegram_user_id=42, reminder_time="09:00")
    get_or_create_settings(conn, telegram_user_id=99)
    conn.close()

    job_queue = MagicMock()
    job_queue.get_jobs_by_name.return_value = []

    schedule_all_reminders(
        job_queue,
        database_path=str(db_path),
        allowed_user_ids=frozenset({42, 99}),
    )

    assert job_queue.run_daily.call_count == 1


@pytest.mark.asyncio
async def test_send_sunday_reminder_sends_personalized_message(tmp_path):
    db_path = tmp_path / "bot.db"
    conn = __import__("bot.db", fromlist=["connect"]).connect(str(db_path))
    __import__("bot.db", fromlist=["init_schema"]).init_schema(conn)
    complete_onboarding(conn, telegram_user_id=42, reminder_time="09:00")
    conn.close()

    context = MagicMock()
    context.job = MagicMock()
    context.job.data = 42
    context.application.bot_data = {
        "allowed_user_ids": frozenset({42}),
        "database_path": str(db_path),
    }
    context.bot.send_message = AsyncMock()

    await send_sunday_reminder(context)

    context.bot.send_message.assert_awaited_once()
    assert context.bot.send_message.await_args.kwargs["chat_id"] == 42
    text = context.bot.send_message.await_args.kwargs["text"]
    assert "Оленка" in text
    assert "/вага" in text


@pytest.mark.asyncio
async def test_send_sunday_reminder_skips_non_allowlisted_user(tmp_path):
    db_path = tmp_path / "bot.db"
    conn = __import__("bot.db", fromlist=["connect"]).connect(str(db_path))
    __import__("bot.db", fromlist=["init_schema"]).init_schema(conn)
    complete_onboarding(conn, telegram_user_id=42, reminder_time="09:00")
    conn.close()

    context = MagicMock()
    context.job = MagicMock()
    context.job.data = 42
    context.application.bot_data = {
        "allowed_user_ids": frozenset({99}),
        "database_path": str(db_path),
    }
    context.bot.send_message = AsyncMock()

    await send_sunday_reminder(context)

    context.bot.send_message.assert_not_awaited()
