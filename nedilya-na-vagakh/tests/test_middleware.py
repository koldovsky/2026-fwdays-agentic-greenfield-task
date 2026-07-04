from unittest.mock import AsyncMock, MagicMock

import pytest
from telegram import Chat, Message, Update, User
from telegram.ext import ApplicationHandlerStop

from bot.middleware import REFUSAL_MESSAGE, allowlist_gate


def _make_update(user_id: int, *, has_message: bool = True) -> Update:
    user = User(id=user_id, is_bot=False, first_name="Test")
    if not has_message:
        return Update(update_id=1)

    message = MagicMock(spec=Message)
    message.reply_text = AsyncMock()
    message.chat = Chat(id=user_id, type="private")
    message.from_user = user
    return Update(update_id=1, message=message)


@pytest.mark.asyncio
async def test_allowlisted_user_passes():
    update = _make_update(12345)
    context = MagicMock()
    context.bot_data = {"allowed_user_ids": frozenset({12345})}

    await allowlist_gate(update, context)

    update.effective_message.reply_text.assert_not_called()


@pytest.mark.asyncio
async def test_non_allowlisted_user_blocked():
    update = _make_update(99999)
    context = MagicMock()
    context.bot_data = {"allowed_user_ids": frozenset({12345})}

    with pytest.raises(ApplicationHandlerStop):
        await allowlist_gate(update, context)

    update.effective_message.reply_text.assert_awaited_once_with(REFUSAL_MESSAGE)


@pytest.mark.asyncio
async def test_missing_user_blocked():
    update = Update(update_id=1)
    context = MagicMock()
    context.bot_data = {"allowed_user_ids": frozenset({12345})}

    with pytest.raises(ApplicationHandlerStop):
        await allowlist_gate(update, context)
