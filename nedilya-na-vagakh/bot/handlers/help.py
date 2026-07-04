from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes

HELP_MESSAGE = (
    "Команди:\n"
    "/start — початкове налаштування або підказка\n"
    "/вага — записати зважування\n"
    "/прогрес — останній запис і порівняння\n"
    "/історія — останні 8 записів\n"
    "/місяць — підсумок поточного місяця\n"
    "/весь_час — підсумок за весь час\n"
    "/налаштування — ім'я та час нагадування\n"
    "/скасувати — скасувати останній запис\n"
    "/допомога — ця підказка\n\n"
    "Формат запису: чотири числа — вага (кг), жир (%), м'язи (%), BMI.\n"
    "Приклад: 72,4 28,5 32,1 24,8"
)


async def dopomoga_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if context.user_data is not None:
        context.user_data["awaiting_weigh_in"] = False
        context.user_data.pop("settings_awaiting", None)
    if update.effective_message is not None:
        await update.effective_message.reply_text(HELP_MESSAGE)
