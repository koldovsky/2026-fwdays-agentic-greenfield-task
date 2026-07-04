from __future__ import annotations

from datetime import datetime

from telegram import Update
from telegram.ext import ContextTypes

from bot.db import connect
from bot.handlers.settings import SETTINGS_AWAITING_KEY
from bot.handlers.weigh_in import AWAITING_WEIGH_IN_KEY
from bot.month_stats import (
    KYIV_TZ,
    find_best_month,
    latest_before_month,
    summarize_month,
)
from bot.repository import (
    count_weigh_ins,
    get_first_weigh_in,
    get_or_create_settings,
    list_weigh_ins_asc,
    list_weigh_ins_desc,
)
from bot.view_format import (
    ALL_TIME_EMPTY_MESSAGE,
    HISTORY_EMPTY_MESSAGE,
    MONTH_EMPTY_MESSAGE,
    PROGRESS_EMPTY_MESSAGE,
    build_all_time_message,
    build_history_table,
    build_month_message,
    build_progress_message,
)

HISTORY_LIMIT = 8


def _reset_transient_flows(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Clear single-shot prompt state so a read command doesn't leave a stale
    weigh-in/settings prompt that swallows the user's next message."""
    if context.user_data is None:
        return
    context.user_data[AWAITING_WEIGH_IN_KEY] = False
    context.user_data.pop(SETTINGS_AWAITING_KEY, None)


async def istoriya_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    user = update.effective_user
    if message is None or user is None:
        return

    _reset_transient_flows(context)

    database_path = context.bot_data["database_path"]
    conn = connect(database_path)
    try:
        entries = list_weigh_ins_desc(conn, user.id, limit=HISTORY_LIMIT)
    finally:
        conn.close()

    if not entries:
        await message.reply_text(HISTORY_EMPTY_MESSAGE)
        return

    await message.reply_text(
        build_history_table(entries),
        parse_mode="Markdown",
    )


async def progres_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    user = update.effective_user
    if message is None or user is None:
        return

    _reset_transient_flows(context)

    database_path = context.bot_data["database_path"]
    conn = connect(database_path)
    try:
        settings = get_or_create_settings(conn, user.id)
        recent = list_weigh_ins_desc(conn, user.id, limit=2)
        entry_count = count_weigh_ins(conn, user.id)
        first = get_first_weigh_in(conn, user.id) if entry_count > 0 else None
    finally:
        conn.close()

    if not recent:
        await message.reply_text(PROGRESS_EMPTY_MESSAGE)
        return

    latest = recent[0]
    previous = recent[1] if len(recent) > 1 else None
    reply = build_progress_message(
        latest,
        previous=previous,
        first=first,
        entry_count=entry_count,
        display_name=settings.display_name,
    )
    await message.reply_text(reply)


async def misyats_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    user = update.effective_user
    if message is None or user is None:
        return

    _reset_transient_flows(context)

    now_kyiv = datetime.now(KYIV_TZ)
    database_path = context.bot_data["database_path"]
    conn = connect(database_path)
    try:
        settings = get_or_create_settings(conn, user.id)
        entries = list_weigh_ins_asc(conn, user.id)
    finally:
        conn.close()

    pre_month_latest = latest_before_month(
        entries, year=now_kyiv.year, month=now_kyiv.month
    )
    summary = summarize_month(
        entries,
        year=now_kyiv.year,
        month=now_kyiv.month,
        pre_month_latest=pre_month_latest,
    )

    if summary.entry_count == 0:
        await message.reply_text(MONTH_EMPTY_MESSAGE)
        return

    reply = build_month_message(
        summary,
        entries,
        now_kyiv=now_kyiv,
        display_name=settings.display_name,
    )
    await message.reply_text(reply)


async def ves_chas_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    user = update.effective_user
    if message is None or user is None:
        return

    _reset_transient_flows(context)

    database_path = context.bot_data["database_path"]
    conn = connect(database_path)
    try:
        entries = list_weigh_ins_asc(conn, user.id)
    finally:
        conn.close()

    if not entries:
        await message.reply_text(ALL_TIME_EMPTY_MESSAGE)
        return

    best = find_best_month(entries)
    await message.reply_text(build_all_time_message(entries, best=best))
