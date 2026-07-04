from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from telegram import Chat, Message, Update, User

from bot.db import connect, init_schema
from bot.handlers.settings import SETTINGS_AWAITING_KEY
from bot.handlers.views import (
    istoriya_command,
    misyats_command,
    progres_command,
    ves_chas_command,
)
from bot.handlers.weigh_in import AWAITING_WEIGH_IN_KEY
from bot.messages import ALL_SUPPORT_LINES, PROGRESS_LINES
from bot.month_stats import KYIV_TZ
from bot.repository import get_or_create_settings, insert_weigh_in
from bot.view_format import (
    ALL_TIME_EMPTY_MESSAGE,
    HISTORY_EMPTY_MESSAGE,
    MONTH_EMPTY_MESSAGE,
    MONTH_SPARSE_MESSAGE,
    PROGRESS_EMPTY_MESSAGE,
)


def _make_message_update(user_id: int, text: str) -> Update:
    user = User(id=user_id, is_bot=False, first_name="Test")
    message = MagicMock(spec=Message)
    message.reply_text = AsyncMock()
    message.text = text
    message.chat = Chat(id=user_id, type="private")
    message.from_user = user
    return Update(update_id=1, message=message)


def _seed_entries(conn, user_id: int = 42) -> None:
    get_or_create_settings(conn, telegram_user_id=user_id)
    insert_weigh_in(
        conn,
        user_id=user_id,
        weight_kg=72.4,
        fat_pct=28.5,
        muscle_pct=32.1,
        bmi=24.8,
        recorded_at="2026-06-01T09:00:00+00:00",
    )
    insert_weigh_in(
        conn,
        user_id=user_id,
        weight_kg=71.8,
        fat_pct=28.2,
        muscle_pct=32.3,
        bmi=24.6,
        recorded_at="2026-07-01T09:00:00+00:00",
    )


@pytest.mark.asyncio
async def test_view_command_clears_stale_prompt_flags(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    _seed_entries(conn)
    conn.close()

    update = _make_message_update(42, "/історія")
    context = MagicMock()
    context.bot_data = {"database_path": db_path}
    context.user_data = {AWAITING_WEIGH_IN_KEY: True, SETTINGS_AWAITING_KEY: "name"}

    await istoriya_command(update, context)

    assert context.user_data[AWAITING_WEIGH_IN_KEY] is False
    assert SETTINGS_AWAITING_KEY not in context.user_data


@pytest.mark.asyncio
async def test_istoriya_command_empty(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    conn.close()

    update = _make_message_update(42, "/історія")
    context = MagicMock()
    context.bot_data = {"database_path": db_path}

    await istoriya_command(update, context)

    update.effective_message.reply_text.assert_awaited_once_with(HISTORY_EMPTY_MESSAGE)


@pytest.mark.asyncio
async def test_istoriya_command_shows_table_without_supportive_copy(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    _seed_entries(conn)
    conn.close()

    update = _make_message_update(42, "/історія")
    context = MagicMock()
    context.bot_data = {"database_path": db_path}

    await istoriya_command(update, context)

    update.effective_message.reply_text.assert_awaited_once()
    args, kwargs = update.effective_message.reply_text.await_args
    reply = args[0]
    assert kwargs.get("parse_mode") == "Markdown"
    assert "Дата" in reply
    assert "71,8" in reply
    assert not any(line in reply for line in ALL_SUPPORT_LINES)


@pytest.mark.asyncio
async def test_progres_command_empty(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    conn.close()

    update = _make_message_update(42, "/прогрес")
    context = MagicMock()
    context.bot_data = {"database_path": db_path}

    await progres_command(update, context)

    update.effective_message.reply_text.assert_awaited_once_with(PROGRESS_EMPTY_MESSAGE)


@pytest.mark.asyncio
async def test_progres_command_single_entry_baseline(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
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
    conn.close()

    update = _make_message_update(42, "/прогрес")
    context = MagicMock()
    context.bot_data = {"database_path": db_path}

    await progres_command(update, context)

    reply = update.effective_message.reply_text.await_args.args[0]
    assert "Останній запис" in reply
    assert "Стартова точка" in reply
    assert not any(line in reply for line in ALL_SUPPORT_LINES)


@pytest.mark.asyncio
async def test_progres_command_includes_supportive_line(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    _seed_entries(conn)
    conn.close()

    update = _make_message_update(42, "/прогрес")
    context = MagicMock()
    context.bot_data = {"database_path": db_path}

    await progres_command(update, context)

    reply = update.effective_message.reply_text.await_args.args[0]
    assert "Порівняно з попереднім:" in reply
    assert "Оленка," in reply
    assert any(line in reply for line in PROGRESS_LINES)


@pytest.mark.asyncio
async def test_misyats_command_empty_month(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=72.4,
        fat_pct=28.5,
        muscle_pct=32.1,
        bmi=24.8,
        recorded_at="2026-05-01T09:00:00+00:00",
    )
    conn.close()

    fixed_now = datetime(2026, 7, 3, 12, 0, tzinfo=KYIV_TZ)
    update = _make_message_update(42, "/місяць")
    context = MagicMock()
    context.bot_data = {"database_path": db_path}

    with patch("bot.handlers.views.datetime") as mock_datetime:
        mock_datetime.now.return_value = fixed_now
        await misyats_command(update, context)

    update.effective_message.reply_text.assert_awaited_once_with(MONTH_EMPTY_MESSAGE)


@pytest.mark.asyncio
async def test_misyats_command_single_entry_sparse_message(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=72.4,
        fat_pct=28.5,
        muscle_pct=32.1,
        bmi=24.8,
        recorded_at="2026-07-05T09:00:00+00:00",
    )
    conn.close()

    fixed_now = datetime(2026, 7, 10, 12, 0, tzinfo=KYIV_TZ)
    update = _make_message_update(42, "/місяць")
    context = MagicMock()
    context.bot_data = {"database_path": db_path}

    with patch("bot.handlers.views.datetime") as mock_datetime:
        mock_datetime.now.return_value = fixed_now
        await misyats_command(update, context)

    reply = update.effective_message.reply_text.await_args.args[0]
    assert MONTH_SPARSE_MESSAGE in reply
    assert not any(line in reply for line in ALL_SUPPORT_LINES)


@pytest.mark.asyncio
async def test_misyats_command_multi_entry_includes_supportive_line(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
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
    insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=71.8,
        fat_pct=28.2,
        muscle_pct=32.3,
        bmi=24.6,
        recorded_at="2026-07-08T09:00:00+00:00",
    )
    conn.close()

    fixed_now = datetime(2026, 7, 10, 12, 0, tzinfo=KYIV_TZ)
    update = _make_message_update(42, "/місяць")
    context = MagicMock()
    context.bot_data = {"database_path": db_path}

    with patch("bot.handlers.views.datetime") as mock_datetime:
        mock_datetime.now.return_value = fixed_now
        await misyats_command(update, context)

    reply = update.effective_message.reply_text.await_args.args[0]
    assert "З початку місяця:" in reply
    assert "Оленка," in reply
    assert any(line in reply for line in PROGRESS_LINES)


@pytest.mark.asyncio
async def test_ves_chas_command_empty(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    conn.close()

    update = _make_message_update(42, "/весь_час")
    context = MagicMock()
    context.bot_data = {"database_path": db_path}

    await ves_chas_command(update, context)

    update.effective_message.reply_text.assert_awaited_once_with(ALL_TIME_EMPTY_MESSAGE)


@pytest.mark.asyncio
async def test_ves_chas_command_shows_summary_and_best_month(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)
    insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=73.0,
        fat_pct=28.5,
        muscle_pct=32.1,
        bmi=24.8,
        recorded_at="2026-05-01T09:00:00+00:00",
    )
    insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=72.0,
        fat_pct=28.2,
        muscle_pct=32.3,
        bmi=24.6,
        recorded_at="2026-05-15T09:00:00+00:00",
    )
    insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=71.5,
        fat_pct=28.0,
        muscle_pct=32.4,
        bmi=24.5,
        recorded_at="2026-06-15T09:00:00+00:00",
    )
    conn.close()

    update = _make_message_update(42, "/весь_час")
    context = MagicMock()
    context.bot_data = {"database_path": db_path}

    await ves_chas_command(update, context)

    reply = update.effective_message.reply_text.await_args.args[0]
    assert "Всього записів: 3" in reply
    assert "Від першого до останнього:" in reply
    assert "Найкращий місяць: травень 2026" in reply
