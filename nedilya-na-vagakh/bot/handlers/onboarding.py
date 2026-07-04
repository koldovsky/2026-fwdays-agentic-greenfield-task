from __future__ import annotations

import sqlite3
from typing import Any

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Message, Update
from telegram.ext import ContextTypes

from bot.db import connect
from bot.handlers.help import HELP_MESSAGE
from bot.handlers.settings import (
    SETTINGS_AWAITING_KEY,
    TIME_INVALID_ERROR,
    TIME_PROMPT_MESSAGE,
)
from bot.handlers.weigh_in import AWAITING_WEIGH_IN_KEY, HINT_MESSAGE
from bot.reminder_scheduler import schedule_user_reminder_if_eligible
from bot.reminder_time import ReminderTimeError, parse_reminder_time
from bot.repository import (
    RepositoryError,
    complete_onboarding,
    get_or_create_settings,
    update_reminder_time,
)

ONBOARDING_STEP_KEY = "onboarding_step"
ONBOARDING_CALLBACK_PATTERN = r"^onboard:"

STEP_REMINDER_TIME = "reminder_time"
STEP_CUSTOM_TIME = "custom_time"
STEP_WEIGH_IN = "weigh_in"

CALLBACK_PRESET_PREFIX = "onboard:preset:"
CALLBACK_CUSTOM_TIME = "onboard:custom_time"
CALLBACK_SKIP = "onboard:skip"
CALLBACK_WEIGH_IN_NOW = "onboard:weigh_in_now"
CALLBACK_WEIGH_IN_LATER = "onboard:weigh_in_later"

START_HELP_MESSAGE = HELP_MESSAGE
WELCOME_MESSAGE = (
    "Вітаю! Це «Неділя на вагах» — бот для щотижневих зважувань.\n\n"
    "Коли нагадувати у неділю?"
)
WEIGH_IN_PROMPT_MESSAGE = "Записати перше зважування зараз?"
SETUP_COMPLETE_MESSAGE = (
    "Готово! Коли будеш готова — надішли /вага або дивись /допомога за підказками."
)
SAVE_ERROR_MESSAGE = "Не вдалося зберегти налаштування. Спробуй ще раз через /start."

PRESET_TIMES = ("08:00", "09:00", "10:00")


def _user_data(context: ContextTypes.DEFAULT_TYPE) -> dict[str, Any]:
    if context.user_data is None:
        raise RuntimeError("user_data is unavailable outside user-scoped handlers")
    return context.user_data


def _clear_onboarding(context: ContextTypes.DEFAULT_TYPE) -> None:
    _user_data(context).pop(ONBOARDING_STEP_KEY, None)


def _clear_other_flows(context: ContextTypes.DEFAULT_TYPE) -> None:
    _user_data(context)[AWAITING_WEIGH_IN_KEY] = False
    _user_data(context).pop(SETTINGS_AWAITING_KEY, None)


def reminder_time_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(
                    time, callback_data=f"{CALLBACK_PRESET_PREFIX}{time}"
                )
                for time in PRESET_TIMES
            ],
            [InlineKeyboardButton("Свій час", callback_data=CALLBACK_CUSTOM_TIME)],
            [InlineKeyboardButton("Пропустити", callback_data=CALLBACK_SKIP)],
        ]
    )


def weigh_in_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton("Зараз", callback_data=CALLBACK_WEIGH_IN_NOW),
                InlineKeyboardButton("Пізніше", callback_data=CALLBACK_WEIGH_IN_LATER),
            ]
        ]
    )


async def _reply_weigh_in_step(
    message: Message, context: ContextTypes.DEFAULT_TYPE
) -> None:
    _user_data(context)[ONBOARDING_STEP_KEY] = STEP_WEIGH_IN
    await message.reply_text(
        WEIGH_IN_PROMPT_MESSAGE,
        reply_markup=weigh_in_keyboard(),
    )


async def _save_reminder_time_and_continue(
    message: Message,
    context: ContextTypes.DEFAULT_TYPE,
    user_id: int,
    reminder_time: str,
) -> bool:
    database_path = context.bot_data["database_path"]
    conn = connect(database_path)
    try:
        update_reminder_time(conn, user_id, reminder_time)
    except (RepositoryError, sqlite3.Error):
        await message.reply_text(SAVE_ERROR_MESSAGE)
        return False
    finally:
        conn.close()

    await _reply_weigh_in_step(message, context)
    return True


async def start_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    message = update.effective_message
    if user is None or message is None:
        return

    _clear_other_flows(context)

    database_path = context.bot_data["database_path"]
    conn = connect(database_path)
    try:
        settings = get_or_create_settings(conn, user.id)
    finally:
        conn.close()

    if settings.setup_completed_at is not None:
        await message.reply_text(START_HELP_MESSAGE)
        return

    _user_data(context)[ONBOARDING_STEP_KEY] = STEP_REMINDER_TIME
    await message.reply_text(WELCOME_MESSAGE, reply_markup=reminder_time_keyboard())


async def onboarding_callback(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    query = update.callback_query
    user = update.effective_user
    if query is None or user is None or query.data is None:
        return

    await query.answer()
    if not isinstance(query.message, Message):
        return

    database_path = context.bot_data["database_path"]
    conn = connect(database_path)
    try:
        settings = get_or_create_settings(conn, user.id)
    finally:
        conn.close()

    if settings.setup_completed_at is not None:
        return

    data = query.data
    current_step = _user_data(context).get(ONBOARDING_STEP_KEY)

    if data.startswith(CALLBACK_PRESET_PREFIX):
        if current_step != STEP_REMINDER_TIME:
            return
        reminder_time = data.removeprefix(CALLBACK_PRESET_PREFIX)
        await _save_reminder_time_and_continue(
            query.message, context, user.id, reminder_time
        )
        return

    if data == CALLBACK_SKIP:
        if current_step != STEP_REMINDER_TIME:
            return
        await _save_reminder_time_and_continue(query.message, context, user.id, "09:00")
        return

    if data == CALLBACK_CUSTOM_TIME:
        if current_step != STEP_REMINDER_TIME:
            return
        _clear_other_flows(context)
        _user_data(context)[ONBOARDING_STEP_KEY] = STEP_CUSTOM_TIME
        await query.message.reply_text(TIME_PROMPT_MESSAGE)
        return

    if data in (CALLBACK_WEIGH_IN_NOW, CALLBACK_WEIGH_IN_LATER):
        if current_step != STEP_WEIGH_IN:
            return

        conn = connect(database_path)
        try:
            settings = get_or_create_settings(conn, user.id)
            settings = complete_onboarding(
                conn, user.id, reminder_time=settings.reminder_time
            )
        except (RepositoryError, sqlite3.Error):
            await query.message.reply_text(SAVE_ERROR_MESSAGE)
            return
        finally:
            conn.close()

        schedule_user_reminder_if_eligible(
            context.application.job_queue,
            settings,
            allowed_user_ids=context.bot_data.get("allowed_user_ids"),
        )
        _clear_onboarding(context)

        if data == CALLBACK_WEIGH_IN_LATER:
            await query.message.reply_text(SETUP_COMPLETE_MESSAGE)
            return

        _user_data(context)[AWAITING_WEIGH_IN_KEY] = True
        await query.message.reply_text(HINT_MESSAGE, parse_mode="Markdown")


async def onboarding_message(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    if _user_data(context).get(ONBOARDING_STEP_KEY) != STEP_CUSTOM_TIME:
        return

    _clear_other_flows(context)

    message = update.effective_message
    user = update.effective_user
    if message is None or user is None or message.text is None:
        return

    try:
        reminder_time = parse_reminder_time(message.text)
    except ReminderTimeError:
        await message.reply_text(TIME_INVALID_ERROR)
        return

    await _save_reminder_time_and_continue(message, context, user.id, reminder_time)
