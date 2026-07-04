from __future__ import annotations

import sqlite3
from typing import Any

from telegram import Message, Update, User
from telegram.ext import ContextTypes

from bot.compare import build_comparison_message, compute_metric_deltas
from bot.db import connect
from bot.messages import pick_support_line
from bot.models import WeighIn
from bot.parse import ParsedWeighIn, ParseError, format_uk_decimal, parse_weigh_in
from bot.reminder_scheduler import schedule_user_reminder_if_eligible
from bot.repository import (
    RepositoryError,
    complete_onboarding,
    delete_latest_weigh_in,
    get_first_weigh_in,
    get_latest_weigh_in,
    get_or_create_settings,
    insert_weigh_in,
)
from bot.trends import classify_trend

AWAITING_WEIGH_IN_KEY = "awaiting_weigh_in"
ONBOARDING_STEP_KEY = "onboarding_step"

HINT_MESSAGE = (
    "Надішли чотири числа: вага (кг), жир (%), м'язи (%), BMI.\n"
    "Приклад: `72,4 28,5 32,1 24,8`"
)
INVALID_MESSAGE = (
    "Не вдалося розпізнати. Надішли чотири числа через пробіл, наприклад: "
    "`72,4 28,5 32,1 24,8`"
)
RANGE_MESSAGE = (
    "Схоже, якесь значення виходить за межі очікуваного. Перевір і надішли "
    "ще раз, наприклад: `72,4 28,5 32,1 24,8`"
)
UNDO_OK_MESSAGE = "Останній запис скасовано."
UNDO_EMPTY_MESSAGE = "Немає записів для скасування."
SAVE_ERROR_MESSAGE = "Не вдалося зберегти запис. Спробуй ще раз через /вага."
SETUP_SAVE_ERROR_MESSAGE = (
    "Не вдалося завершити налаштування. Спробуй ще раз через /start або /вага."
)


def _user_data(context: ContextTypes.DEFAULT_TYPE) -> dict[str, Any]:
    if context.user_data is None:
        raise RuntimeError("user_data is unavailable outside user-scoped handlers")
    return context.user_data


def _success_message(
    weight_kg: float, fat_pct: float, muscle_pct: float, bmi: float
) -> str:
    return (
        "Записано:\n"
        f"вага - {format_uk_decimal(weight_kg)} кг,\n"
        f"жир - {format_uk_decimal(fat_pct)} %,\n"
        f"м'язи - {format_uk_decimal(muscle_pct)} %,\n"
        f"BMI - {format_uk_decimal(bmi)}"
    )


def _parse_error_reply(exc: ParseError) -> str:
    if getattr(exc, "kind", "") == "out_of_range":
        return RANGE_MESSAGE
    return INVALID_MESSAGE


def _inline_weigh_in_args(text: str | None) -> str:
    """Return the text after a leading ``/command`` token, or ``""``.

    Supports ``/вага 72,4 ...`` and newline-separated ``/вага\\n72,4\\n...``.
    """
    if not text:
        return ""
    stripped = text.strip()
    if not stripped.startswith("/"):
        return ""
    parts = stripped.split(maxsplit=1)
    return parts[1].strip() if len(parts) > 1 else ""


async def _log_weigh_in(
    message: Message,
    context: ContextTypes.DEFAULT_TYPE,
    user: User,
    parsed: ParsedWeighIn,
) -> None:
    """Persist a parsed weigh-in and reply with confirmation + comparison.

    Also completes onboarding on the first successful log (so a user who never
    ran ``/start`` still gets Sunday reminders scheduled — FR-REM-01).
    """
    database_path = context.bot_data["database_path"]
    conn = connect(database_path)
    saved = False
    success_reply: str | None = None
    inserted: WeighIn | None = None
    previous: WeighIn | None = None
    settings = None
    newly_completed = False
    try:
        settings = get_or_create_settings(conn, user.id)
        previous = get_latest_weigh_in(conn, user.id)
        inserted = insert_weigh_in(
            conn,
            user_id=user.id,
            weight_kg=parsed.weight_kg,
            fat_pct=parsed.fat_pct,
            muscle_pct=parsed.muscle_pct,
            bmi=parsed.bmi,
        )
        saved = True
        if settings.setup_completed_at is None:
            settings = complete_onboarding(
                conn, user.id, reminder_time=settings.reminder_time
            )
            newly_completed = True
    except (RepositoryError, sqlite3.Error):
        await message.reply_text(SAVE_ERROR_MESSAGE)
    else:
        factual = _success_message(
            parsed.weight_kg,
            parsed.fat_pct,
            parsed.muscle_pct,
            parsed.bmi,
        )
        try:
            first = get_first_weigh_in(conn, user.id) if previous is not None else None
            entry_count = 1 if previous is None else 2
            comparison = build_comparison_message(
                inserted,
                previous=previous,
                first=first,
                entry_count=entry_count,
            )
            success_reply = f"{factual}\n\n{comparison}"
            if previous is not None and inserted is not None:
                deltas = compute_metric_deltas(inserted, previous)
                weight_trend = classify_trend(deltas.weight_kg)
                support = pick_support_line(
                    weight_trend,
                    display_name=settings.display_name,
                )
                success_reply = f"{success_reply}\n\n{support}"
        except (RepositoryError, sqlite3.Error):
            success_reply = factual
    finally:
        conn.close()

    if newly_completed and settings is not None:
        schedule_user_reminder_if_eligible(
            context.application.job_queue,
            settings,
            allowed_user_ids=context.bot_data.get("allowed_user_ids"),
        )

    if saved and success_reply is not None:
        await message.reply_text(success_reply)


async def _complete_onboarding_if_active(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> bool:
    user_data = _user_data(context)
    if user_data.get(ONBOARDING_STEP_KEY) is None:
        return True

    message = update.effective_message
    user = update.effective_user
    if message is None or user is None:
        return False

    database_path = context.bot_data["database_path"]
    conn = connect(database_path)
    newly_completed: bool = False
    settings = None
    try:
        settings = get_or_create_settings(conn, user.id)
        if settings.setup_completed_at is None:
            settings = complete_onboarding(
                conn, user.id, reminder_time=settings.reminder_time
            )
            newly_completed = True
    except (RepositoryError, sqlite3.Error):
        await message.reply_text(SETUP_SAVE_ERROR_MESSAGE)
        return False
    finally:
        conn.close()

    if newly_completed and settings is not None:
        schedule_user_reminder_if_eligible(
            context.application.job_queue,
            settings,
            allowed_user_ids=context.bot_data.get("allowed_user_ids"),
        )

    user_data.pop(ONBOARDING_STEP_KEY, None)
    return True


async def vaga_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    _user_data(context).pop("settings_awaiting", None)
    if not await _complete_onboarding_if_active(update, context):
        return

    message = update.effective_message
    user = update.effective_user
    inline = _inline_weigh_in_args(message.text if message is not None else None)

    if inline:
        _user_data(context)[AWAITING_WEIGH_IN_KEY] = False
        if message is None or user is None:
            return
        try:
            parsed = parse_weigh_in(inline)
        except ParseError as exc:
            await message.reply_text(_parse_error_reply(exc), parse_mode="Markdown")
            return
        await _log_weigh_in(message, context, user, parsed)
        return

    _user_data(context)[AWAITING_WEIGH_IN_KEY] = True
    if message is not None:
        await message.reply_text(HINT_MESSAGE, parse_mode="Markdown")


async def weigh_in_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if _user_data(context).get(ONBOARDING_STEP_KEY) == "custom_time":
        return

    if not _user_data(context).get(AWAITING_WEIGH_IN_KEY):
        return

    message = update.effective_message
    user = update.effective_user
    if message is None or user is None or message.text is None:
        return

    _user_data(context)[AWAITING_WEIGH_IN_KEY] = False

    try:
        parsed = parse_weigh_in(message.text)
    except ParseError as exc:
        await message.reply_text(_parse_error_reply(exc), parse_mode="Markdown")
        return

    await _log_weigh_in(message, context, user, parsed)


async def skasuvaty_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    user = update.effective_user
    if message is None or user is None:
        return

    _user_data(context)[AWAITING_WEIGH_IN_KEY] = False

    database_path = context.bot_data["database_path"]
    conn = connect(database_path)
    try:
        deleted = delete_latest_weigh_in(conn, user.id)
    finally:
        conn.close()

    if deleted is None:
        await message.reply_text(UNDO_EMPTY_MESSAGE)
    else:
        await message.reply_text(UNDO_OK_MESSAGE)
