from __future__ import annotations

from telegram import Update
from telegram.ext import ApplicationHandlerStop, ContextTypes

REFUSAL_MESSAGE = "Вибачте, цей бот призначений лише для особистого користування."


async def allowlist_gate(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    allowed_ids: frozenset[int] = context.bot_data["allowed_user_ids"]

    if user is None or user.id not in allowed_ids:
        if update.effective_message is not None:
            await update.effective_message.reply_text(REFUSAL_MESSAGE)
        raise ApplicationHandlerStop()
