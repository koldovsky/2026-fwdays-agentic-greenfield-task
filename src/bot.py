"""Telegram bot interface for the expense tracker."""

import asyncio
import logging
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, ContextTypes, filters

from .config import TELEGRAM_BOT_TOKEN
from .processor import process_expense
from .storage import ExpenseStore, StorageError

_store = ExpenseStore()
logger = logging.getLogger(__name__)


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /start command."""
    message = (
        "Привіт! 👋 Я ваш бот для відслідковування витрат.\n\n"
        "Просто відправте мені текст з описанням витрати (наприклад, 'купив каву за 50'), "
        "і я запишу це за вас.\n\n"
        "Команди:\n"
        "/report — показати список витрат\n"
        "/start — ця вказівка\n"
    )
    await update.message.reply_text(message)


async def report(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle /report command."""
    try:
        expenses = await asyncio.to_thread(_store.get_all_expenses)
        total = await asyncio.to_thread(_store.get_total_expense)

        if not expenses:
            await update.message.reply_text("📊 Витрат не знайдено.")
            return

        lines = ["📊 Ваші витрати:\n"]
        for exp in expenses:
            dt = exp["datetime"]
            date_str = dt.strftime("%Y-%m-%d") if hasattr(dt, "strftime") else str(dt)[:10]
            time_str = dt.strftime("%H:%M") if hasattr(dt, "strftime") else str(dt)[11:16]
            lines.append(
                f"• {exp['amount']} UAH ({exp['category']}) — {exp['description']} ({date_str} {time_str})"
            )
        lines.append(f"\n💰 Всього: {total} UAH")

        message = "\n".join(lines)
        await update.message.reply_text(message)
    except StorageError as e:
        logger.error(f"Storage error in report: {e}")
        await update.message.reply_text("❌ Помилка отримання витрат. Спробуйте пізніше.")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle expense message."""
    user_input = update.message.text.strip()
    logger.debug(f"Processing user input: {user_input}")

    if not user_input:
        return

    try:
        # Process the expense
        logger.debug("Calling process_expense...")
        result = await asyncio.to_thread(process_expense, user_input)
        logger.debug(f"process_expense returned: success={result.success}, message={result.message}")

        if result.success and result.expenses:
            # Store all expenses
            try:
                logger.debug(f"Storing {len(result.expenses)} expense(s)")
                await asyncio.to_thread(_store.store_expenses, result.expenses, result.validation_errors)
                summary = ", ".join(
                    f"{e.amount} UAH ({e.category})" for e in result.expenses
                )
                await update.message.reply_text(f"{result.message}: {summary}")
            except StorageError as e:
                logger.error(f"Storage error: {e}", exc_info=True)
                await update.message.reply_text("❌ Помилка збереження. Спробуйте пізніше.")
        else:
            # Processing failed
            logger.warning(f"Processing failed: {result.message}")
            await update.message.reply_text(result.message)
    except Exception as e:
        logger.error(f"Error processing message: {e}", exc_info=True)
        await update.message.reply_text(f"❌ Помилка обробки: {str(e)}")


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Log errors caused by Updates."""
    logger.error(f"Update {update} caused error {context.error}", exc_info=context.error)
    if isinstance(update, Update) and update.message:
        await update.message.reply_text("❌ Виникла помилка. Спробуйте пізніше.")


def main() -> None:
    """Start the Telegram bot."""
    application = Application.builder().token(TELEGRAM_BOT_TOKEN).build()

    # Add handlers
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("report", report))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    # Add error handler
    application.add_error_handler(error_handler)

    # Run
    logger.info("Starting bot...")
    application.run_polling()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger.info("Starting bot...")
    main()
