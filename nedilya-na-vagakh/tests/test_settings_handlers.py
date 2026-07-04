from unittest.mock import AsyncMock, MagicMock

import pytest
from telegram import CallbackQuery, Chat, Message, Update, User

from bot.db import connect, init_schema
from bot.handlers.settings import (
    CALLBACK_CHANGE_NAME,
    CALLBACK_CHANGE_TIME,
    CALLBACK_CLEAR_NAME,
    NAME_CLEARED_MESSAGE,
    NAME_EMPTY_ERROR,
    NAME_PROMPT_MESSAGE,
    NAME_SAVED_MESSAGE,
    NAME_TOO_LONG_ERROR,
    SETTINGS_AWAITING_KEY,
    TIME_INVALID_ERROR,
    TIME_PROMPT_MESSAGE,
    TIME_SAVED_MESSAGE,
    format_settings_summary,
    nalashtuvannya_command,
    settings_callback,
    settings_message,
)
from bot.handlers.weigh_in import AWAITING_WEIGH_IN_KEY
from bot.repository import get_or_create_settings, update_display_name


def _make_message_update(user_id: int, text: str) -> Update:
    user = User(id=user_id, is_bot=False, first_name="Test")
    message = MagicMock(spec=Message)
    message.reply_text = AsyncMock()
    message.text = text
    message.chat = Chat(id=user_id, type="private")
    message.from_user = user
    return Update(update_id=1, message=message)


def _make_callback_update(user_id: int, data: str) -> Update:
    user = User(id=user_id, is_bot=False, first_name="Test")
    message = MagicMock(spec=Message)
    message.reply_text = AsyncMock()
    message.chat = Chat(id=user_id, type="private")
    query = MagicMock(spec=CallbackQuery)
    query.answer = AsyncMock()
    query.data = data
    query.from_user = user
    query.message = message
    return Update(update_id=1, callback_query=query)


def _context(db_path: str) -> MagicMock:
    context = MagicMock()
    context.bot_data = {"database_path": db_path}
    context.user_data = {}
    return context


def test_format_settings_summary_with_name():
    conn = connect(":memory:")
    init_schema(conn)
    settings = get_or_create_settings(conn, telegram_user_id=1)
    text = format_settings_summary(settings)
    conn.close()
    assert "Оленка" in text
    assert "09:00" in text
    assert "неділя" in text


def test_format_settings_summary_cleared_name(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    update_display_name(conn, telegram_user_id=42, display_name=None)
    settings = get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    text = format_settings_summary(settings)
    assert "загальні повідомлення" in text


@pytest.mark.asyncio
async def test_nalashtuvannya_command_shows_summary_with_keyboard(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    update = _make_message_update(42, "/налаштування")
    context = _context(db_path)

    await nalashtuvannya_command(update, context)

    update.effective_message.reply_text.assert_awaited_once()
    args, kwargs = update.effective_message.reply_text.await_args
    assert "Оленка" in args[0]
    assert "09:00" in args[0]
    assert kwargs["reply_markup"] is not None


@pytest.mark.asyncio
async def test_settings_callback_change_name_prompts(tmp_path):
    db_path = str(tmp_path / "bot.db")
    update = _make_callback_update(42, CALLBACK_CHANGE_NAME)
    context = _context(db_path)

    await settings_callback(update, context)

    update.callback_query.answer.assert_awaited_once()
    update.callback_query.message.reply_text.assert_awaited_once_with(
        NAME_PROMPT_MESSAGE
    )
    assert context.user_data[SETTINGS_AWAITING_KEY] == "name"


@pytest.mark.asyncio
async def test_settings_message_updates_name(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    update = _make_message_update(42, "Марія")
    context = _context(db_path)
    context.user_data[SETTINGS_AWAITING_KEY] = "name"

    await settings_message(update, context)

    update.effective_message.reply_text.assert_awaited_once_with(
        NAME_SAVED_MESSAGE.format(name="Марія")
    )
    assert SETTINGS_AWAITING_KEY not in context.user_data

    conn = connect(db_path)
    settings = get_or_create_settings(conn, telegram_user_id=42)
    conn.close()
    assert settings.display_name == "Марія"


@pytest.mark.asyncio
async def test_settings_message_rejects_empty_name(tmp_path):
    db_path = str(tmp_path / "bot.db")
    update = _make_message_update(42, "   ")
    context = _context(db_path)
    context.user_data[SETTINGS_AWAITING_KEY] = "name"

    await settings_message(update, context)

    update.effective_message.reply_text.assert_awaited_once_with(NAME_EMPTY_ERROR)
    assert context.user_data[SETTINGS_AWAITING_KEY] == "name"


@pytest.mark.asyncio
async def test_settings_message_rejects_too_long_name(tmp_path):
    db_path = str(tmp_path / "bot.db")
    update = _make_message_update(42, "а" * 41)
    context = _context(db_path)
    context.user_data[SETTINGS_AWAITING_KEY] = "name"

    await settings_message(update, context)

    update.effective_message.reply_text.assert_awaited_once_with(NAME_TOO_LONG_ERROR)


@pytest.mark.asyncio
async def test_settings_callback_clear_name(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    update = _make_callback_update(42, CALLBACK_CLEAR_NAME)
    context = _context(db_path)

    await settings_callback(update, context)

    update.callback_query.message.reply_text.assert_awaited_once_with(
        NAME_CLEARED_MESSAGE
    )

    conn = connect(db_path)
    settings = get_or_create_settings(conn, telegram_user_id=42)
    conn.close()
    assert settings.display_name is None


@pytest.mark.asyncio
async def test_settings_callback_change_time_prompts(tmp_path):
    db_path = str(tmp_path / "bot.db")
    update = _make_callback_update(42, CALLBACK_CHANGE_TIME)
    context = _context(db_path)

    await settings_callback(update, context)

    update.callback_query.message.reply_text.assert_awaited_once_with(
        TIME_PROMPT_MESSAGE
    )
    assert context.user_data[SETTINGS_AWAITING_KEY] == "reminder_time"


@pytest.mark.asyncio
async def test_settings_message_updates_reminder_time(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    update = _make_message_update(42, "10:15")
    context = _context(db_path)
    context.user_data[SETTINGS_AWAITING_KEY] = "reminder_time"

    await settings_message(update, context)

    update.effective_message.reply_text.assert_awaited_once_with(
        TIME_SAVED_MESSAGE.format(time="10:15")
    )

    conn = connect(db_path)
    settings = get_or_create_settings(conn, telegram_user_id=42)
    conn.close()
    assert settings.reminder_time == "10:15"


@pytest.mark.asyncio
async def test_settings_message_rejects_invalid_reminder_time(tmp_path):
    db_path = str(tmp_path / "bot.db")
    update = _make_message_update(42, "invalid")
    context = _context(db_path)
    context.user_data[SETTINGS_AWAITING_KEY] = "reminder_time"

    await settings_message(update, context)

    update.effective_message.reply_text.assert_awaited_once_with(TIME_INVALID_ERROR)
    assert context.user_data[SETTINGS_AWAITING_KEY] == "reminder_time"


@pytest.mark.asyncio
async def test_nalashtuvannya_clears_weigh_in_await(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    update = _make_message_update(42, "/налаштування")
    context = _context(db_path)
    context.user_data[AWAITING_WEIGH_IN_KEY] = True

    await nalashtuvannya_command(update, context)

    assert context.user_data[AWAITING_WEIGH_IN_KEY] is False
