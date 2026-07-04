"""Dispatch-level integration tests.

These exercise the real ``Application.process_update`` routing rather than
calling handlers directly. They guard against the handler-group collision where
several ``filters.TEXT & ~filters.COMMAND`` handlers share a group and PTB only
runs one handler per group (regression protection for the weigh-in flow).
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

import pytest
from telegram import Chat, Message, MessageEntity, Update, User

from bot.config import Config
from bot.db import connect
from bot.handlers.settings import SETTINGS_AWAITING_KEY
from bot.handlers.weigh_in import AWAITING_WEIGH_IN_KEY
from bot.main import build_application
from bot.repository import count_weigh_ins, get_or_create_settings

ALLOWED_USER_ID = 42


def _text_update(update_id: int, user_id: int, text: str) -> Update:
    user = User(id=user_id, is_bot=False, first_name="Test")
    chat = Chat(id=user_id, type="private")
    message = Message(
        message_id=update_id,
        date=None,
        chat=chat,
        from_user=user,
        text=text,
    )
    return Update(update_id=update_id, message=message)


def _command_update(update_id: int, user_id: int, text: str) -> Update:
    """Like ``_text_update`` but with the bot_command entity Telegram attaches,
    so ``filters.COMMAND`` recognizes it and text handlers skip it."""
    user = User(id=user_id, is_bot=False, first_name="Test")
    chat = Chat(id=user_id, type="private")
    entity = MessageEntity(type=MessageEntity.BOT_COMMAND, offset=0, length=len(text))
    message = Message(
        message_id=update_id,
        date=None,
        chat=chat,
        from_user=user,
        text=text,
        entities=(entity,),
    )
    return Update(update_id=update_id, message=message)


def _build_app(db_path: str):
    config = Config(
        bot_token="test-token",
        allowed_user_ids=frozenset({ALLOWED_USER_ID}),
        database_path=db_path,
    )
    application = build_application(config)
    # Bypass the network-bound Application.initialize(); we dispatch updates
    # directly and stub out replies below.
    application._initialized = True
    return application


@pytest.mark.asyncio
async def test_weigh_in_text_is_routed_and_persisted(tmp_path):
    db_path = str(tmp_path / "bot.db")
    app = _build_app(db_path)

    with patch.object(Message, "reply_text", new=AsyncMock()):
        # /вага arms the weigh-in flow, then the four numbers must reach
        # weigh_in_message even though onboarding/settings text handlers exist.
        await app.process_update(_command_update(1, ALLOWED_USER_ID, "/вага"))
        assert app.user_data[ALLOWED_USER_ID][AWAITING_WEIGH_IN_KEY] is True

        await app.process_update(
            _text_update(2, ALLOWED_USER_ID, "72,4 28,5 32,1 24,8")
        )

    conn = connect(db_path)
    try:
        assert count_weigh_ins(conn, ALLOWED_USER_ID) == 1
    finally:
        conn.close()
    assert app.user_data[ALLOWED_USER_ID][AWAITING_WEIGH_IN_KEY] is False


@pytest.mark.asyncio
async def test_settings_name_text_is_routed(tmp_path):
    db_path = str(tmp_path / "bot.db")
    app = _build_app(db_path)

    # Arm the settings "change name" flow directly, then send the new name.
    app.user_data[ALLOWED_USER_ID][SETTINGS_AWAITING_KEY] = "name"

    with patch.object(Message, "reply_text", new=AsyncMock()):
        await app.process_update(_text_update(1, ALLOWED_USER_ID, "Оксана"))

    conn = connect(db_path)
    try:
        settings = get_or_create_settings(conn, ALLOWED_USER_ID)
    finally:
        conn.close()
    assert settings.display_name == "Оксана"


@pytest.mark.asyncio
async def test_non_allowlisted_text_is_blocked(tmp_path):
    db_path = str(tmp_path / "bot.db")
    app = _build_app(db_path)
    stranger_id = 999

    app.user_data[stranger_id][AWAITING_WEIGH_IN_KEY] = True

    with patch.object(Message, "reply_text", new=AsyncMock()):
        await app.process_update(_text_update(1, stranger_id, "72,4 28,5 32,1 24,8"))

    conn = connect(db_path)
    try:
        assert count_weigh_ins(conn, stranger_id) == 0
    finally:
        conn.close()
