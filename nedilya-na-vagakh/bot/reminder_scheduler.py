from __future__ import annotations

import logging
from datetime import time
from zoneinfo import ZoneInfo

from telegram.ext import ContextTypes, JobQueue

from bot.db import connect
from bot.models import UserSettings
from bot.reminder_message import format_reminder_message
from bot.reminder_time import parse_reminder_time
from bot.repository import get_or_create_settings, list_completed_user_settings

logger = logging.getLogger(__name__)


def reminder_job_name(telegram_user_id: int) -> str:
    return f"sunday_reminder_{telegram_user_id}"


def python_weekday_to_job_days(weekday: int) -> tuple[int, ...]:
    """Map Python weekday (Mon=0 .. Sun=6) to PTB run_daily days (Sun=0 .. Sat=6)."""
    return ((weekday + 1) % 7,)


def reminder_time_to_components(reminder_time: str) -> tuple[int, int]:
    normalized = parse_reminder_time(reminder_time)
    hour_str, minute_str = normalized.split(":")
    return int(hour_str), int(minute_str)


async def send_sunday_reminder(context: ContextTypes.DEFAULT_TYPE) -> None:
    if context.job is None:
        return

    user_id = context.job.data
    if not isinstance(user_id, int):
        logger.warning("Sunday reminder job has invalid user id: %r", user_id)
        return

    allowed_user_ids = context.application.bot_data.get("allowed_user_ids")
    if not isinstance(allowed_user_ids, frozenset) or user_id not in allowed_user_ids:
        return

    database_path = context.application.bot_data["database_path"]
    conn = connect(database_path)
    try:
        settings = get_or_create_settings(conn, user_id)
        if settings.setup_completed_at is None:
            return
        text = format_reminder_message(settings.display_name)
        await context.bot.send_message(chat_id=user_id, text=text)
    except Exception:
        logger.exception("Failed to send Sunday reminder to user %s", user_id)
    finally:
        conn.close()


def schedule_user_reminder(job_queue: JobQueue | None, settings: UserSettings) -> None:
    if job_queue is None:
        return

    hour, minute = reminder_time_to_components(settings.reminder_time)
    timezone = ZoneInfo(settings.reminder_timezone)
    name = reminder_job_name(settings.telegram_user_id)

    for job in job_queue.get_jobs_by_name(name):
        job.schedule_removal()

    job_queue.run_daily(
        send_sunday_reminder,
        time=time(hour=hour, minute=minute, tzinfo=timezone),
        days=python_weekday_to_job_days(settings.reminder_weekday),
        name=name,
        data=settings.telegram_user_id,
    )


def schedule_user_reminder_if_eligible(
    job_queue: JobQueue | None,
    settings: UserSettings,
    *,
    allowed_user_ids: frozenset[int] | None = None,
) -> None:
    if settings.setup_completed_at is None:
        return
    if (
        allowed_user_ids is not None
        and settings.telegram_user_id not in allowed_user_ids
    ):
        return
    schedule_user_reminder(job_queue, settings)


def schedule_all_reminders(
    job_queue: JobQueue | None,
    *,
    database_path: str,
    allowed_user_ids: frozenset[int],
) -> None:
    if job_queue is None:
        logger.warning(
            "JobQueue unavailable; Sunday reminders not scheduled. "
            'Install with pip install "python-telegram-bot[job-queue]".'
        )
        return

    conn = connect(database_path)
    try:
        for settings in list_completed_user_settings(conn):
            schedule_user_reminder_if_eligible(
                job_queue,
                settings,
                allowed_user_ids=allowed_user_ids,
            )
    finally:
        conn.close()
