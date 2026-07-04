import re
from unittest.mock import AsyncMock, MagicMock

import pytest
from telegram.ext import MessageHandler, filters

from bot.commands import (
    BOT_COMMANDS,
    COMMAND_SPECS,
    FR_CMD_01_COMMAND_NAMES,
    TELEGRAM_MENU_COMMAND_PATTERN,
    command_filter,
    command_spec_filter,
)
from bot.config import Config
from bot.main import _on_application_init, _register_command_menu, build_application


def test_bot_commands_match_fr_cmd_01():
    command_names = tuple(spec.handler_name for spec in COMMAND_SPECS)
    assert command_names == FR_CMD_01_COMMAND_NAMES


def test_telegram_menu_command_names_are_api_compatible():
    for command in BOT_COMMANDS:
        assert TELEGRAM_MENU_COMMAND_PATTERN.match(command.command)


def test_bot_command_descriptions_are_ukrainian():
    for command in BOT_COMMANDS:
        assert command.description
        assert command.description.strip() == command.description


def _command_regex_patterns(application) -> list[re.Pattern[str]]:
    patterns: list[re.Pattern[str]] = []
    for handler in application.handlers.get(0, []):
        if isinstance(handler, MessageHandler) and isinstance(
            handler.filters, filters.Regex
        ):
            patterns.append(handler.filters.pattern)
    return patterns


def test_each_roster_command_has_registered_handler():
    config = Config(
        bot_token="test-token",
        allowed_user_ids=frozenset({12345}),
        database_path=":memory:",
    )
    application = build_application(config)
    patterns = _command_regex_patterns(application)

    for command_name in FR_CMD_01_COMMAND_NAMES:
        assert any(pattern.match(f"/{command_name}") for pattern in patterns), (
            f"no handler registered for /{command_name}"
        )


def test_menu_aliases_route_to_same_handlers():
    for spec in COMMAND_SPECS:
        if spec.handler_name == spec.menu_name:
            continue
        pattern = command_spec_filter(spec).pattern
        assert pattern.match(f"/{spec.handler_name}")
        assert pattern.match(f"/{spec.menu_name}")


def test_command_filter_matches_bot_username_suffix():
    pattern = command_filter("вага", "vaga").pattern
    assert pattern.match("/вага")
    assert pattern.match("/вага@MyBot")
    assert pattern.match("/vaga@MyBot")


def test_command_filter_matches_inline_arguments():
    pattern = command_filter("вага", "vaga").pattern
    assert pattern.match("/вага 72,4 28,5 32,1 24,8")
    assert pattern.match("/вага\n72,4 28,5 32,1 24,8")
    assert pattern.match("/вага@MyBot 72,4 28,5 32,1 24,8")


def test_command_filter_keeps_word_boundary():
    pattern = command_filter("вага", "vaga").pattern
    assert pattern.match("/ваганнячко") is None
    assert pattern.match("/vagabond") is None


def test_build_application_registers_post_init_hook():
    config = Config(
        bot_token="test-token",
        allowed_user_ids=frozenset({12345}),
        database_path=":memory:",
    )
    application = build_application(config)

    assert application.post_init is _on_application_init


@pytest.mark.asyncio
async def test_register_command_menu_logs_failure_without_raising():
    application = MagicMock()
    application.bot.set_my_commands = AsyncMock(
        side_effect=RuntimeError("network down")
    )

    await _register_command_menu(application)

    application.bot.set_my_commands.assert_awaited_once_with(BOT_COMMANDS)


@pytest.mark.asyncio
async def test_register_command_menu_sets_bot_commands():
    application = MagicMock()
    application.bot.set_my_commands = AsyncMock()

    await _register_command_menu(application)

    application.bot.set_my_commands.assert_awaited_once_with(BOT_COMMANDS)
