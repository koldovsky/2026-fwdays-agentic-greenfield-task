from unittest.mock import AsyncMock, MagicMock

import pytest
from telegram import Chat, Message, Update, User

from bot.db import connect, init_schema
from bot.handlers.weigh_in import (
    AWAITING_WEIGH_IN_KEY,
    HINT_MESSAGE,
    INVALID_MESSAGE,
    RANGE_MESSAGE,
    SAVE_ERROR_MESSAGE,
    UNDO_EMPTY_MESSAGE,
    UNDO_OK_MESSAGE,
    skasuvaty_command,
    vaga_command,
    weigh_in_message,
)
from bot.messages import PROGRESS_LINES
from bot.repository import (
    RepositoryError,
    get_latest_weigh_in,
    get_or_create_settings,
    insert_weigh_in,
)


def _make_message_update(user_id: int, text: str) -> Update:
    user = User(id=user_id, is_bot=False, first_name="Test")
    message = MagicMock(spec=Message)
    message.reply_text = AsyncMock()
    message.text = text
    message.chat = Chat(id=user_id, type="private")
    message.from_user = user
    return Update(update_id=1, message=message)


@pytest.mark.asyncio
async def test_vaga_command_sets_awaiting_and_sends_hint():
    update = _make_message_update(42, "/вага")
    context = MagicMock()
    context.user_data = {}

    await vaga_command(update, context)

    assert context.user_data[AWAITING_WEIGH_IN_KEY] is True
    update.effective_message.reply_text.assert_awaited_once_with(
        HINT_MESSAGE, parse_mode="Markdown"
    )


@pytest.mark.asyncio
async def test_weigh_in_message_persists_valid_input(tmp_path):
    db_path = str(tmp_path / "bot.db")
    update = _make_message_update(42, "72,4 28,5 32,1 24,8")
    context = MagicMock()
    context.user_data = {AWAITING_WEIGH_IN_KEY: True}
    context.bot_data = {"database_path": db_path}

    conn = connect(db_path)
    init_schema(conn)
    conn.close()

    await weigh_in_message(update, context)

    conn = connect(db_path)
    latest = get_latest_weigh_in(conn, user_id=42)
    conn.close()

    assert context.user_data[AWAITING_WEIGH_IN_KEY] is False
    assert latest is not None
    assert latest.weight_kg == 72.4
    update.effective_message.reply_text.assert_awaited_once()
    reply = update.effective_message.reply_text.await_args.args[0]
    assert "Записано" in reply
    assert "Стартова точка" in reply
    assert "Оленка," not in reply


@pytest.mark.asyncio
async def test_weigh_in_message_second_entry_includes_deltas(tmp_path):
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
        recorded_at="2026-06-01T09:00:00+00:00",
    )
    conn.close()

    update = _make_message_update(42, "71,8 28,2 32,3 24,6")
    context = MagicMock()
    context.user_data = {AWAITING_WEIGH_IN_KEY: True}
    context.bot_data = {"database_path": db_path}

    await weigh_in_message(update, context)

    reply = update.effective_message.reply_text.await_args.args[0]
    assert "Порівняно з попереднім:" in reply
    assert "вага −0,6 кг — прогрес," in reply
    assert "жир −0,3 % — прогрес," in reply
    assert "м'язи +0,2 % — без змін," in reply
    assert "BMI −0,2 — без змін" in reply
    assert "Від старту: −0,6 кг" in reply
    assert "Оленка," in reply
    assert any(line in reply for line in PROGRESS_LINES)


@pytest.mark.asyncio
async def test_weigh_in_message_backdated_entry_uses_pre_insert_previous(
    tmp_path, monkeypatch
):
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
        recorded_at="2026-06-01T09:00:00+00:00",
    )
    insert_weigh_in(
        conn,
        user_id=42,
        weight_kg=71.0,
        fat_pct=28.0,
        muscle_pct=32.0,
        bmi=24.5,
        recorded_at="2026-09-01T09:00:00+00:00",
    )
    conn.close()

    original_insert = insert_weigh_in

    def insert_with_august_timestamp(conn, **kwargs):
        return original_insert(
            conn,
            recorded_at="2026-08-01T09:00:00+00:00",
            **kwargs,
        )

    update = _make_message_update(42, "70,5 27,5 32,5 24,0")
    context = MagicMock()
    context.user_data = {AWAITING_WEIGH_IN_KEY: True}
    context.bot_data = {"database_path": db_path}

    import bot.handlers.weigh_in as weigh_in_module

    monkeypatch.setattr(
        weigh_in_module,
        "insert_weigh_in",
        insert_with_august_timestamp,
    )

    await weigh_in_message(update, context)

    reply = update.effective_message.reply_text.await_args.args[0]
    assert "Порівняно з попереднім:" in reply
    assert "вага −0,5 кг — прогрес," in reply
    assert "Від старту: −1,9 кг" in reply


@pytest.mark.asyncio
async def test_weigh_in_message_still_confirms_when_comparison_lookup_fails(
    tmp_path, monkeypatch
):
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
        recorded_at="2026-06-01T09:00:00+00:00",
    )
    conn.close()

    update = _make_message_update(42, "71,8 28,2 32,3 24,6")
    context = MagicMock()
    context.user_data = {AWAITING_WEIGH_IN_KEY: True}
    context.bot_data = {"database_path": db_path}

    def fail_first_lookup(*_args, **_kwargs):
        raise RepositoryError("simulated comparison lookup failure")

    monkeypatch.setattr(
        "bot.handlers.weigh_in.get_first_weigh_in",
        fail_first_lookup,
    )

    await weigh_in_message(update, context)

    conn = connect(db_path)
    latest = get_latest_weigh_in(conn, user_id=42)
    conn.close()

    assert latest is not None
    assert latest.weight_kg == 71.8
    reply = update.effective_message.reply_text.await_args.args[0]
    assert "Записано" in reply
    assert "Порівняно з попереднім:" not in reply


@pytest.mark.asyncio
async def test_weigh_in_message_invalid_input():
    update = _make_message_update(42, "not valid")
    context = MagicMock()
    context.user_data = {AWAITING_WEIGH_IN_KEY: True}
    context.bot_data = {"database_path": ":memory:"}

    await weigh_in_message(update, context)

    assert context.user_data[AWAITING_WEIGH_IN_KEY] is False
    update.effective_message.reply_text.assert_awaited_once_with(
        INVALID_MESSAGE, parse_mode="Markdown"
    )


@pytest.mark.asyncio
async def test_weigh_in_message_out_of_range_input():
    update = _make_message_update(42, "500 28,5 32,1 24,8")
    context = MagicMock()
    context.user_data = {AWAITING_WEIGH_IN_KEY: True}
    context.bot_data = {"database_path": ":memory:"}

    await weigh_in_message(update, context)

    assert context.user_data[AWAITING_WEIGH_IN_KEY] is False
    update.effective_message.reply_text.assert_awaited_once_with(
        RANGE_MESSAGE, parse_mode="Markdown"
    )


@pytest.mark.asyncio
async def test_vaga_command_inline_persists(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    conn.close()

    update = _make_message_update(42, "/вага 72,4 28,5 32,1 24,8")
    context = MagicMock()
    context.user_data = {}
    context.bot_data = {"database_path": db_path, "allowed_user_ids": frozenset({42})}

    await vaga_command(update, context)

    conn = connect(db_path)
    latest = get_latest_weigh_in(conn, user_id=42)
    conn.close()

    assert latest is not None
    assert latest.weight_kg == 72.4
    assert context.user_data[AWAITING_WEIGH_IN_KEY] is False
    reply = update.effective_message.reply_text.await_args.args[0]
    assert "Записано" in reply


@pytest.mark.asyncio
async def test_vaga_command_inline_out_of_range_does_not_persist(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    conn.close()

    update = _make_message_update(42, "/вага 500 28,5 32,1 24,8")
    context = MagicMock()
    context.user_data = {}
    context.bot_data = {"database_path": db_path}

    await vaga_command(update, context)

    conn = connect(db_path)
    latest = get_latest_weigh_in(conn, user_id=42)
    conn.close()

    assert latest is None
    update.effective_message.reply_text.assert_awaited_once_with(
        RANGE_MESSAGE, parse_mode="Markdown"
    )


@pytest.mark.asyncio
async def test_vaga_command_without_args_arms_and_hints():
    update = _make_message_update(42, "/вага")
    context = MagicMock()
    context.user_data = {}

    await vaga_command(update, context)

    assert context.user_data[AWAITING_WEIGH_IN_KEY] is True
    update.effective_message.reply_text.assert_awaited_once_with(
        HINT_MESSAGE, parse_mode="Markdown"
    )


@pytest.mark.asyncio
async def test_first_log_completes_onboarding_and_schedules(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    get_or_create_settings(conn, telegram_user_id=42)  # setup_completed_at is None
    conn.close()

    update = _make_message_update(42, "72,4 28,5 32,1 24,8")
    context = MagicMock()
    context.user_data = {AWAITING_WEIGH_IN_KEY: True}
    context.bot_data = {"database_path": db_path, "allowed_user_ids": frozenset({42})}
    context.application.job_queue.get_jobs_by_name.return_value = []

    await weigh_in_message(update, context)

    conn = connect(db_path)
    settings = get_or_create_settings(conn, telegram_user_id=42)
    conn.close()

    assert settings.setup_completed_at is not None
    context.application.job_queue.run_daily.assert_called_once()


@pytest.mark.asyncio
async def test_weigh_in_message_clears_awaiting_on_save_failure(monkeypatch):
    update = _make_message_update(42, "72,4 28,5 32,1 24,8")
    context = MagicMock()
    context.user_data = {AWAITING_WEIGH_IN_KEY: True}
    context.bot_data = {"database_path": ":memory:"}

    def fail_insert(*_args, **_kwargs):
        raise RepositoryError("simulated persistence failure")

    monkeypatch.setattr(
        "bot.handlers.weigh_in.insert_weigh_in",
        fail_insert,
    )

    await weigh_in_message(update, context)

    assert context.user_data[AWAITING_WEIGH_IN_KEY] is False
    update.effective_message.reply_text.assert_awaited_once_with(SAVE_ERROR_MESSAGE)


@pytest.mark.asyncio
async def test_weigh_in_message_ignored_when_not_awaiting():
    update = _make_message_update(42, "72,4 28,5 32,1 24,8")
    context = MagicMock()
    context.user_data = {}

    await weigh_in_message(update, context)

    update.effective_message.reply_text.assert_not_called()


@pytest.mark.asyncio
async def test_skasuvaty_command_deletes_latest(tmp_path):
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

    update = _make_message_update(42, "/скасувати")
    context = MagicMock()
    context.user_data = {AWAITING_WEIGH_IN_KEY: True}
    context.bot_data = {"database_path": db_path}

    await skasuvaty_command(update, context)

    conn = connect(db_path)
    latest = get_latest_weigh_in(conn, user_id=42)
    conn.close()

    assert context.user_data[AWAITING_WEIGH_IN_KEY] is False
    assert latest is None
    update.effective_message.reply_text.assert_awaited_once_with(UNDO_OK_MESSAGE)


@pytest.mark.asyncio
async def test_skasuvaty_command_empty(tmp_path):
    db_path = str(tmp_path / "bot.db")
    conn = connect(db_path)
    init_schema(conn)
    conn.close()

    update = _make_message_update(42, "/скасувати")
    context = MagicMock()
    context.user_data = {}
    context.bot_data = {"database_path": db_path}

    await skasuvaty_command(update, context)

    update.effective_message.reply_text.assert_awaited_once_with(UNDO_EMPTY_MESSAGE)
