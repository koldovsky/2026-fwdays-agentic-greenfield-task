from __future__ import annotations

import sqlite3
from typing import Any

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Message, Update
from telegram.ext import ContextTypes

from bot.db import connect
from bot.handlers.weigh_in import AWAITING_WEIGH_IN_KEY
from bot.models import UserSettings
from bot.name_validation import NameValidationError, validate_display_name
from bot.reminder_scheduler import schedule_user_reminder_if_eligible
from bot.reminder_time import ReminderTimeError, parse_reminder_time
from bot.repository import (
    RepositoryError,
    get_or_create_settings,
    update_display_name,
    update_reminder_time,
)

SETTINGS_AWAITING_KEY = "settings_awaiting"
SETTINGS_CALLBACK_PATTERN = r"^settings:"
ONBOARDING_STEP_KEY = "onboarding_step"

CALLBACK_CHANGE_NAME = "settings:change_name"
CALLBACK_CLEAR_NAME = "settings:clear_name"
CALLBACK_CHANGE_TIME = "settings:change_time"

NAME_PROMPT_MESSAGE = "Надішли нове ім'я для звернень у повідомленнях."
TIME_PROMPT_MESSAGE = "Надішли час нагадування у форматі ГГ:ХХ, наприклад 09:00."
NAME_EMPTY_ERROR = "Ім'я не може бути порожнім. Спробуй ще раз."
NAME_TOO_LONG_ERROR = "Ім'я занадто довге (максимум 40 символів). Спробуй ще раз."
TIME_INVALID_ERROR = (
    "Не вдалося розпізнати час. Надішли у форматі ГГ:ХХ, наприклад 09:00."
)
NAME_SAVED_MESSAGE = "Ім'я змінено на «{name}»."
NAME_CLEARED_MESSAGE = "Ім'я очищено — повідомлення будуть загальними."
TIME_SAVED_MESSAGE = "Час нагадування змінено на {time}."
SAVE_ERROR_MESSAGE = (
    "Не вдалося зберегти налаштування. Спробуй ще раз через /налаштування."
)


def _user_data(context: ContextTypes.DEFAULT_TYPE) -> dict[str, Any]:
    if context.user_data is None:
        raise RuntimeError("user_data is unavailable outside user-scoped handlers")
    return context.user_data


def _clear_settings_await(context: ContextTypes.DEFAULT_TYPE) -> None:
    _user_data(context).pop(SETTINGS_AWAITING_KEY, None)


def _clear_onboarding_await(context: ContextTypes.DEFAULT_TYPE) -> None:
    _user_data(context).pop(ONBOARDING_STEP_KEY, None)


def format_settings_summary(settings: UserSettings) -> str:
    if settings.display_name is not None and settings.display_name.strip():
        name_line = f"Ім'я: {settings.display_name}"
    else:
        name_line = "Ім'я: загальні повідомлення (без імені)"

    return (
        "Налаштування:\n"
        f"{name_line}\n"
        f"Нагадування: неділя о {settings.reminder_time} "
        f"({settings.reminder_timezone})\n\n"
        "Обери дію нижче."
    )


def settings_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [InlineKeyboardButton("Змінити ім'я", callback_data=CALLBACK_CHANGE_NAME)],
            [InlineKeyboardButton("Очистити ім'я", callback_data=CALLBACK_CLEAR_NAME)],
            [InlineKeyboardButton("Змінити час", callback_data=CALLBACK_CHANGE_TIME)],
        ]
    )


async def _reply_settings_menu(
    update: Update, context: ContextTypes.DEFAULT_TYPE, user_id: int
) -> None:
    database_path = context.bot_data["database_path"]
    conn = connect(database_path)
    try:
        settings = get_or_create_settings(conn, user_id)
    finally:
        conn.close()

    message = update.effective_message
    if message is not None:
        await message.reply_text(
            format_settings_summary(settings),
            reply_markup=settings_keyboard(),
        )


async def nalashtuvannya_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE
) -> None:
    user = update.effective_user
    if user is None:
        return

    _user_data(context)[AWAITING_WEIGH_IN_KEY] = False
    _clear_settings_await(context)
    _clear_onboarding_await(context)
    await _reply_settings_menu(update, context, user.id)


async def settings_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    user = update.effective_user
    if query is None or user is None or query.data is None:
        return

    await query.answer()
    _user_data(context)[AWAITING_WEIGH_IN_KEY] = False
    _clear_onboarding_await(context)

    if query.data == CALLBACK_CHANGE_NAME:
        _user_data(context)[SETTINGS_AWAITING_KEY] = "name"
        if isinstance(query.message, Message):
            await query.message.reply_text(NAME_PROMPT_MESSAGE)
        return

    if query.data == CALLBACK_CHANGE_TIME:
        _user_data(context)[SETTINGS_AWAITING_KEY] = "reminder_time"
        if isinstance(query.message, Message):
            await query.message.reply_text(TIME_PROMPT_MESSAGE)
        return

    if query.data == CALLBACK_CLEAR_NAME:
        _clear_settings_await(context)
        database_path = context.bot_data["database_path"]
        conn = connect(database_path)
        try:
            update_display_name(conn, user.id, None)
        except (RepositoryError, sqlite3.Error):
            if isinstance(query.message, Message):
                await query.message.reply_text(SAVE_ERROR_MESSAGE)
            return
        finally:
            conn.close()

        if isinstance(query.message, Message):
            await query.message.reply_text(NAME_CLEARED_MESSAGE)


async def settings_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if _user_data(context).get("onboarding_step") == "custom_time":
        return

    awaiting = _user_data(context).get(SETTINGS_AWAITING_KEY)
    if not awaiting:
        return

    message = update.effective_message
    user = update.effective_user
    if message is None or user is None or message.text is None:
        return

    database_path = context.bot_data["database_path"]
    conn = connect(database_path)

    try:
        if awaiting == "name":
            try:
                name = validate_display_name(message.text)
            except NameValidationError as exc:
                if exc.args[0] == "empty":
                    await message.reply_text(NAME_EMPTY_ERROR)
                else:
                    await message.reply_text(NAME_TOO_LONG_ERROR)
                return

            try:
                update_display_name(conn, user.id, name)
            except (RepositoryError, sqlite3.Error):
                await message.reply_text(SAVE_ERROR_MESSAGE)
                _clear_settings_await(context)
                return

            _clear_settings_await(context)
            await message.reply_text(NAME_SAVED_MESSAGE.format(name=name))
            return

        if awaiting == "reminder_time":
            try:
                reminder_time = parse_reminder_time(message.text)
            except ReminderTimeError:
                await message.reply_text(TIME_INVALID_ERROR)
                return

            try:
                settings = update_reminder_time(conn, user.id, reminder_time)
            except (RepositoryError, sqlite3.Error):
                await message.reply_text(SAVE_ERROR_MESSAGE)
                _clear_settings_await(context)
                return

            schedule_user_reminder_if_eligible(
                context.application.job_queue,
                settings,
                allowed_user_ids=context.bot_data.get("allowed_user_ids"),
            )

            _clear_settings_await(context)
            await message.reply_text(TIME_SAVED_MESSAGE.format(time=reminder_time))
    finally:
        conn.close()
