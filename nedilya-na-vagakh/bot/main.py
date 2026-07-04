from __future__ import annotations

import logging

from telegram import Update
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    MessageHandler,
    TypeHandler,
    filters,
)

from bot.commands import BOT_COMMANDS, COMMAND_SPECS, command_spec_filter
from bot.config import Config, load_config
from bot.db import connect, init_schema
from bot.handlers.help import dopomoga_command
from bot.handlers.onboarding import (
    ONBOARDING_CALLBACK_PATTERN,
    onboarding_callback,
    onboarding_message,
    start_command,
)
from bot.handlers.settings import (
    SETTINGS_CALLBACK_PATTERN,
    nalashtuvannya_command,
    settings_callback,
    settings_message,
)
from bot.handlers.views import (
    istoriya_command,
    misyats_command,
    progres_command,
    ves_chas_command,
)
from bot.handlers.weigh_in import (
    skasuvaty_command,
    vaga_command,
    weigh_in_message,
)
from bot.middleware import allowlist_gate
from bot.reminder_scheduler import schedule_all_reminders

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

_COMMAND_HANDLERS = {
    "start": start_command,
    "вага": vaga_command,
    "прогрес": progres_command,
    "історія": istoriya_command,
    "місяць": misyats_command,
    "весь_час": ves_chas_command,
    "налаштування": nalashtuvannya_command,
    "скасувати": skasuvaty_command,
    "допомога": dopomoga_command,
}


async def _register_command_menu(application: Application) -> None:
    try:
        await application.bot.set_my_commands(BOT_COMMANDS)
    except Exception:
        logger.exception("Failed to register Telegram command menu")


async def _on_application_init(application: Application) -> None:
    await _register_command_menu(application)
    schedule_all_reminders(
        application.job_queue,
        database_path=application.bot_data["database_path"],
        allowed_user_ids=application.bot_data["allowed_user_ids"],
    )


def build_application(config: Config) -> Application:
    conn = connect(config.database_path)
    init_schema(conn)
    conn.close()

    application = (
        Application.builder()
        .token(config.bot_token)
        .post_init(_on_application_init)
        .build()
    )
    application.bot_data["allowed_user_ids"] = config.allowed_user_ids
    application.bot_data["database_path"] = config.database_path

    application.add_handler(TypeHandler(Update, allowlist_gate), group=-1)

    for spec in COMMAND_SPECS:
        handler = _COMMAND_HANDLERS[spec.handler_name]
        application.add_handler(
            MessageHandler(command_spec_filter(spec), handler),
            group=0,
        )
    application.add_handler(
        CallbackQueryHandler(settings_callback, pattern=SETTINGS_CALLBACK_PATTERN),
        group=0,
    )
    application.add_handler(
        CallbackQueryHandler(onboarding_callback, pattern=ONBOARDING_CALLBACK_PATTERN),
        group=0,
    )
    # Each state-driven text flow lives in its own group because PTB runs at
    # most one handler per group. Sharing a group would let the first matching
    # handler swallow the update; separate groups let every flow inspect the
    # message and self-guard on its own user_data state.
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, onboarding_message),
        group=1,
    )
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, settings_message),
        group=2,
    )
    application.add_handler(
        MessageHandler(filters.TEXT & ~filters.COMMAND, weigh_in_message),
        group=3,
    )

    return application


def main() -> None:
    config = load_config()
    application = build_application(config)
    logger.info(
        "Bot starting (allowed users: %d, database: %s)",
        len(config.allowed_user_ids),
        config.database_path,
    )
    application.run_polling()


if __name__ == "__main__":
    main()
