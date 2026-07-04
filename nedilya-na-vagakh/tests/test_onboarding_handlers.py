from unittest.mock import AsyncMock, MagicMock

import pytest
from telegram import CallbackQuery, Chat, Message, Update, User

from bot.db import connect, init_schema
from bot.handlers.help import HELP_MESSAGE
from bot.handlers.onboarding import (
    CALLBACK_CUSTOM_TIME,
    CALLBACK_SKIP,
    CALLBACK_WEIGH_IN_LATER,
    CALLBACK_WEIGH_IN_NOW,
    ONBOARDING_STEP_KEY,
    SETUP_COMPLETE_MESSAGE,
    STEP_CUSTOM_TIME,
    STEP_REMINDER_TIME,
    STEP_WEIGH_IN,
    WEIGH_IN_PROMPT_MESSAGE,
    WELCOME_MESSAGE,
    onboarding_callback,
    onboarding_message,
    start_command,
)
from bot.handlers.settings import (
    CALLBACK_CHANGE_NAME,
    NAME_SAVED_MESSAGE,
    SETTINGS_AWAITING_KEY,
    TIME_INVALID_ERROR,
    TIME_PROMPT_MESSAGE,
    nalashtuvannya_command,
    settings_callback,
    settings_message,
)
from bot.handlers.weigh_in import (
    AWAITING_WEIGH_IN_KEY,
    HINT_MESSAGE,
    vaga_command,
    weigh_in_message,
)
from bot.repository import (
    DEFAULT_DISPLAY_NAME,
    complete_onboarding,
    get_latest_weigh_in,
    get_or_create_settings,
)


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


@pytest.mark.asyncio
async def test_start_command_begins_onboarding_for_new_user(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    update = _make_message_update(42, "/start")
    context = _context(db_path)

    await start_command(update, context)

    update.effective_message.reply_text.assert_awaited_once()
    args, kwargs = update.effective_message.reply_text.await_args
    assert WELCOME_MESSAGE in args[0]
    assert kwargs["reply_markup"] is not None
    assert context.user_data[ONBOARDING_STEP_KEY] == STEP_REMINDER_TIME


@pytest.mark.asyncio
async def test_start_command_shows_help_when_onboarding_complete(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    complete_onboarding(
        conn,
        telegram_user_id=42,
        reminder_time="09:00",
        completed_at="2026-07-03T07:00:00+00:00",
    )
    conn.close()

    update = _make_message_update(42, "/start")
    context = _context(db_path)

    await start_command(update, context)

    update.effective_message.reply_text.assert_awaited_once_with(HELP_MESSAGE)


@pytest.mark.asyncio
async def test_onboarding_callback_preset_saves_time_and_shows_weigh_in_step(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    update = _make_callback_update(42, "onboard:preset:10:00")
    context = _context(db_path)
    context.user_data[ONBOARDING_STEP_KEY] = STEP_REMINDER_TIME

    await onboarding_callback(update, context)

    update.callback_query.message.reply_text.assert_awaited_once()
    args, kwargs = update.callback_query.message.reply_text.await_args
    assert WEIGH_IN_PROMPT_MESSAGE in args[0]
    assert kwargs["reply_markup"] is not None
    assert context.user_data[ONBOARDING_STEP_KEY] == STEP_WEIGH_IN

    conn = connect(db_path)
    settings = get_or_create_settings(conn, telegram_user_id=42)
    conn.close()
    assert settings.reminder_time == "10:00"


@pytest.mark.asyncio
async def test_onboarding_callback_skip_uses_default_time(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    update = _make_callback_update(42, CALLBACK_SKIP)
    context = _context(db_path)
    context.user_data[ONBOARDING_STEP_KEY] = STEP_REMINDER_TIME

    await onboarding_callback(update, context)

    conn = connect(db_path)
    settings = get_or_create_settings(conn, telegram_user_id=42)
    conn.close()
    assert settings.reminder_time == "09:00"


@pytest.mark.asyncio
async def test_onboarding_callback_custom_time_prompts(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    update = _make_callback_update(42, CALLBACK_CUSTOM_TIME)
    context = _context(db_path)
    context.user_data[ONBOARDING_STEP_KEY] = STEP_REMINDER_TIME

    await onboarding_callback(update, context)

    update.callback_query.message.reply_text.assert_awaited_once_with(
        TIME_PROMPT_MESSAGE
    )
    assert context.user_data[ONBOARDING_STEP_KEY] == STEP_CUSTOM_TIME


@pytest.mark.asyncio
async def test_onboarding_message_custom_time_valid(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    update = _make_message_update(42, "8:15")
    context = _context(db_path)
    context.user_data[ONBOARDING_STEP_KEY] = STEP_CUSTOM_TIME

    await onboarding_message(update, context)

    update.effective_message.reply_text.assert_awaited_once()
    assert context.user_data[ONBOARDING_STEP_KEY] == STEP_WEIGH_IN

    conn = connect(db_path)
    settings = get_or_create_settings(conn, telegram_user_id=42)
    conn.close()
    assert settings.reminder_time == "08:15"


@pytest.mark.asyncio
async def test_onboarding_message_custom_time_invalid(tmp_path):
    db_path = str(tmp_path / "bot.db")
    update = _make_message_update(42, "not-a-time")
    context = _context(db_path)
    context.user_data[ONBOARDING_STEP_KEY] = STEP_CUSTOM_TIME

    await onboarding_message(update, context)

    update.effective_message.reply_text.assert_awaited_once_with(TIME_INVALID_ERROR)
    assert context.user_data[ONBOARDING_STEP_KEY] == STEP_CUSTOM_TIME


@pytest.mark.asyncio
async def test_onboarding_callback_weigh_in_later_completes_setup(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.execute(
        "UPDATE user_settings SET reminder_time = ? WHERE telegram_user_id = ?",
        ("10:00", 42),
    )
    conn.commit()
    conn.close()

    update = _make_callback_update(42, CALLBACK_WEIGH_IN_LATER)
    context = _context(db_path)
    context.user_data[ONBOARDING_STEP_KEY] = STEP_WEIGH_IN

    await onboarding_callback(update, context)

    update.callback_query.message.reply_text.assert_awaited_once_with(
        SETUP_COMPLETE_MESSAGE
    )
    assert ONBOARDING_STEP_KEY not in context.user_data

    conn = connect(db_path)
    settings = get_or_create_settings(conn, telegram_user_id=42)
    conn.close()
    assert settings.setup_completed_at is not None
    assert settings.display_name == DEFAULT_DISPLAY_NAME
    assert settings.reminder_time == "10:00"


@pytest.mark.asyncio
async def test_onboarding_callback_weigh_in_now_completes_and_awaits_weigh_in(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    update = _make_callback_update(42, CALLBACK_WEIGH_IN_NOW)
    context = _context(db_path)
    context.user_data[ONBOARDING_STEP_KEY] = STEP_WEIGH_IN

    await onboarding_callback(update, context)

    update.callback_query.message.reply_text.assert_awaited_once_with(
        HINT_MESSAGE, parse_mode="Markdown"
    )
    assert context.user_data[AWAITING_WEIGH_IN_KEY] is True
    assert ONBOARDING_STEP_KEY not in context.user_data

    conn = connect(db_path)
    settings = get_or_create_settings(conn, telegram_user_id=42)
    conn.close()
    assert settings.setup_completed_at is not None


@pytest.mark.asyncio
async def test_start_command_clears_other_flows(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    update = _make_message_update(42, "/start")
    context = _context(db_path)
    context.user_data[AWAITING_WEIGH_IN_KEY] = True
    context.user_data[SETTINGS_AWAITING_KEY] = "name"

    await start_command(update, context)

    assert context.user_data[AWAITING_WEIGH_IN_KEY] is False
    assert SETTINGS_AWAITING_KEY not in context.user_data


@pytest.mark.asyncio
async def test_onboarding_callback_ignored_after_setup_complete(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    complete_onboarding(
        conn,
        telegram_user_id=42,
        reminder_time="09:00",
        completed_at="2026-07-03T07:00:00+00:00",
    )
    conn.close()

    update = _make_callback_update(42, "onboard:preset:10:00")
    context = _context(db_path)
    context.user_data[ONBOARDING_STEP_KEY] = STEP_REMINDER_TIME

    await onboarding_callback(update, context)

    update.callback_query.message.reply_text.assert_not_awaited()

    conn = connect(db_path)
    settings = get_or_create_settings(conn, telegram_user_id=42)
    conn.close()
    assert settings.reminder_time == "09:00"


@pytest.mark.asyncio
async def test_onboarding_callback_preset_ignored_on_wrong_step(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    update = _make_callback_update(42, "onboard:preset:10:00")
    context = _context(db_path)
    context.user_data[ONBOARDING_STEP_KEY] = STEP_WEIGH_IN

    await onboarding_callback(update, context)

    update.callback_query.message.reply_text.assert_not_awaited()

    conn = connect(db_path)
    settings = get_or_create_settings(conn, telegram_user_id=42)
    conn.close()
    assert settings.reminder_time == "09:00"


@pytest.mark.asyncio
async def test_onboarding_message_custom_time_clears_settings_await(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    update = _make_message_update(42, "8:15")
    context = _context(db_path)
    context.user_data[ONBOARDING_STEP_KEY] = STEP_CUSTOM_TIME
    context.user_data[SETTINGS_AWAITING_KEY] = "reminder_time"
    context.user_data[AWAITING_WEIGH_IN_KEY] = True

    await onboarding_message(update, context)

    assert SETTINGS_AWAITING_KEY not in context.user_data
    assert context.user_data[AWAITING_WEIGH_IN_KEY] is False


@pytest.mark.asyncio
async def test_vaga_command_during_onboarding_completes_setup(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    update = _make_message_update(42, "/вага")
    context = _context(db_path)
    context.user_data[ONBOARDING_STEP_KEY] = STEP_REMINDER_TIME

    await vaga_command(update, context)

    update.effective_message.reply_text.assert_awaited_once_with(
        HINT_MESSAGE, parse_mode="Markdown"
    )
    assert ONBOARDING_STEP_KEY not in context.user_data
    assert context.user_data[AWAITING_WEIGH_IN_KEY] is True

    conn = connect(db_path)
    settings = get_or_create_settings(conn, telegram_user_id=42)
    conn.close()
    assert settings.setup_completed_at is not None
    assert settings.reminder_time == "09:00"


@pytest.mark.asyncio
async def test_metrics_after_vaga_command_are_not_treated_as_custom_time(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    command_update = _make_message_update(42, "/вага")
    context = _context(db_path)
    context.user_data[ONBOARDING_STEP_KEY] = STEP_CUSTOM_TIME

    await vaga_command(command_update, context)

    metrics_update = _make_message_update(42, "72,4 28,5 32,1 24,8")
    await onboarding_message(metrics_update, context)
    metrics_update.effective_message.reply_text.assert_not_awaited()

    await weigh_in_message(metrics_update, context)

    metrics_update.effective_message.reply_text.assert_awaited_once()
    assert context.user_data[AWAITING_WEIGH_IN_KEY] is False

    conn = connect(db_path)
    latest = get_latest_weigh_in(conn, user_id=42)
    conn.close()
    assert latest is not None
    assert latest.weight_kg == 72.4


@pytest.mark.asyncio
async def test_settings_message_ignored_during_onboarding_custom_time(tmp_path):
    db_path = str(tmp_path / "bot.db")
    update = _make_message_update(42, "10:30")
    context = _context(db_path)
    context.user_data[ONBOARDING_STEP_KEY] = STEP_CUSTOM_TIME
    context.user_data[SETTINGS_AWAITING_KEY] = "reminder_time"

    await settings_message(update, context)

    update.effective_message.reply_text.assert_not_awaited()


@pytest.mark.asyncio
async def test_settings_command_during_custom_time_lets_settings_handle_next_text(
    tmp_path,
):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    context = _context(db_path)
    context.user_data[ONBOARDING_STEP_KEY] = STEP_CUSTOM_TIME

    await nalashtuvannya_command(_make_message_update(42, "/налаштування"), context)
    assert ONBOARDING_STEP_KEY not in context.user_data

    callback_update = _make_callback_update(42, CALLBACK_CHANGE_NAME)
    await settings_callback(callback_update, context)
    assert context.user_data[SETTINGS_AWAITING_KEY] == "name"

    name_update = _make_message_update(42, "Олена")
    await onboarding_message(name_update, context)
    name_update.effective_message.reply_text.assert_not_awaited()

    await settings_message(name_update, context)

    name_update.effective_message.reply_text.assert_awaited_once_with(
        NAME_SAVED_MESSAGE.format(name="Олена")
    )
    assert SETTINGS_AWAITING_KEY not in context.user_data

    conn = connect(db_path)
    settings = get_or_create_settings(conn, telegram_user_id=42)
    conn.close()
    assert settings.display_name == "Олена"
