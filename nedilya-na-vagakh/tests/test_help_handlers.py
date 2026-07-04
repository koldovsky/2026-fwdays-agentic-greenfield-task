from unittest.mock import AsyncMock, MagicMock

import pytest
from telegram import Chat, Message, Update, User

from bot.handlers.help import HELP_MESSAGE, dopomoga_command


def _make_message_update(user_id: int, text: str) -> Update:
    user = User(id=user_id, is_bot=False, first_name="Test")
    message = MagicMock(spec=Message)
    message.reply_text = AsyncMock()
    message.text = text
    message.chat = Chat(id=user_id, type="private")
    message.from_user = user
    return Update(update_id=1, message=message)


@pytest.mark.asyncio
async def test_dopomoga_command_lists_commands():
    update = _make_message_update(42, "/допомога")
    context = MagicMock()

    await dopomoga_command(update, context)

    update.effective_message.reply_text.assert_awaited_once_with(HELP_MESSAGE)
    reply = update.effective_message.reply_text.await_args.args[0]
    assert "/start" in reply
    assert "/вага" in reply
    assert "/скасувати" in reply
    assert "/допомога" in reply
    assert "/прогрес" in reply
    assert "/історія" in reply
    assert "/місяць" in reply
    assert "/весь_час" in reply
    assert "/налаштування" in reply


@pytest.mark.asyncio
async def test_dopomoga_command_includes_weigh_in_format():
    update = _make_message_update(42, "/допомога")
    context = MagicMock()

    await dopomoga_command(update, context)

    reply = update.effective_message.reply_text.await_args.args[0]
    assert "72,4 28,5 32,1 24,8" in reply
    assert "вага" in reply.lower() or "вага (кг)" in reply


@pytest.mark.asyncio
async def test_dopomoga_command_clears_stale_prompt_flags():
    update = _make_message_update(42, "/допомога")
    context = MagicMock()
    context.user_data = {"awaiting_weigh_in": True, "settings_awaiting": "name"}

    await dopomoga_command(update, context)

    assert context.user_data["awaiting_weigh_in"] is False
    assert "settings_awaiting" not in context.user_data
