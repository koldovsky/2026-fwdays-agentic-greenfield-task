# ADR-0002 — grammY as the Telegram client

*Status: Accepted · Date: 2026-06-28 · Source: requirements.md §3, §4*

## Context
The bot's only user surface is Telegram. Without an application framework (see [ADR-0001](./0001-plain-typescript-no-nestjs.md)),
the Telegram library must itself provide enough structure — routing, middleware, composition — to
keep handlers organized. The codebase is TypeScript-first; type safety on the Bot API matters.

## Decision
Use **grammY** as the Telegram bot library. Delivery is via **webhook** (Coolify provides a public
HTTPS URL); grammY's composers/middleware organize command and message handlers.

## Consequences
- **+** TS-first with strong typings over the Bot API — fewer runtime surprises.
- **+** Composers/middleware give framework-like structure without a framework's RAM cost.
- **+** Inline-keyboard support fits the disambiguation UX (requirements §8.0).
- **−** Smaller ecosystem than some older Node Telegram libs; mitigated by active maintenance.

## Alternatives considered
- **node-telegram-bot-api / Telegraf** — rejected: weaker TS story and/or less composable
  middleware for the structure-via-library approach this project relies on.
