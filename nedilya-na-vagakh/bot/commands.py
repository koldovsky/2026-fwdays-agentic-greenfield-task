from __future__ import annotations

import re
from dataclasses import dataclass

from telegram import BotCommand
from telegram.ext import filters

TELEGRAM_MENU_COMMAND_PATTERN = re.compile(r"^[a-z0-9_]{1,32}$")


@dataclass(frozen=True, slots=True)
class CommandSpec:
    handler_name: str
    menu_name: str
    description: str


COMMAND_SPECS: tuple[CommandSpec, ...] = (
    CommandSpec("start", "start", "початкове налаштування або підказка"),
    CommandSpec("вага", "vaga", "записати зважування"),
    CommandSpec("прогрес", "progres", "останній запис і порівняння"),
    CommandSpec("історія", "istoriya", "останні 8 записів"),
    CommandSpec("місяць", "misyats", "підсумок поточного місяця"),
    CommandSpec("весь_час", "ves_chas", "підсумок за весь час"),
    CommandSpec("налаштування", "nalashtuvannya", "ім'я та час нагадування"),
    CommandSpec("скасувати", "skasuvaty", "скасувати останній запис"),
    CommandSpec("допомога", "dopomoga", "список команд і формат запису"),
)

FR_CMD_01_COMMAND_NAMES: tuple[str, ...] = tuple(
    spec.handler_name for spec in COMMAND_SPECS
)

BOT_COMMANDS: list[BotCommand] = [
    BotCommand(spec.menu_name, spec.description) for spec in COMMAND_SPECS
]


def command_filter(*command_names: str) -> filters.Regex:
    alternatives = "|".join(re.escape(name) for name in command_names)
    # Allow optional trailing arguments after the command (e.g. inline weigh-in
    # via "/вага 72,4 28,5 32,1 24,8"). The lookahead keeps a word boundary so
    # "/ваганнячко" does not match "/вага".
    return filters.Regex(rf"^/(?:{alternatives})(?:@\w+)?(?=\s|$)[\s\S]*$")


def command_spec_filter(spec: CommandSpec) -> filters.Regex:
    if spec.handler_name == spec.menu_name:
        return command_filter(spec.handler_name)
    return command_filter(spec.handler_name, spec.menu_name)
