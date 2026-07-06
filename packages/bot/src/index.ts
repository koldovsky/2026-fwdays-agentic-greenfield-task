// @kamerton/bot — the runnable entrypoint (tasks.md 5.6). Long-polling
// grammY bot wired to the real production adapters:
//   • GrammyTelegramTransport  — Telegram I/O (long polling, NFR-LOCAL-01)
//   • AnthropicModelPort        — the Claude tool-loop model (claude-sonnet-5;
//     auth resolves from the ambient local user token / ANTHROPIC_AUTH_TOKEN
//     via the SDK's OWN resolution — no API-key code path here, NFR-SEC-01)
//   • GoogleCalendarPort        — the DEMO calendar (service-account JWT)
//   • openDatabase              — the local SQLite file (TC-DATA-01)
//
// Every inbound update is handed to pipeline.ts's `handleUpdate`, partially
// applied over these deps — this file is pure wiring, no business logic, so
// (like GrammyTelegramTransport) it is not unit-tested: it needs a live
// TELEGRAM_BOT_TOKEN and the network. The whole pipeline contract is covered
// by pipeline.test.ts through the fakes.
//
// Run with:  node packages/bot/src/index.ts   (Node ≥ 20; .env at repo root)

import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { openDatabase } from "@kamerton/db";
import { AnthropicModelPort } from "@kamerton/agent/src/anthropic-model-port.ts";
import { GoogleCalendarPort } from "@kamerton/calendar";
import { GrammyTelegramTransport } from "./telegram-transport.ts";
import { handleUpdate, type HandleUpdateDeps } from "./pipeline.ts";
import { TELEGRAM_SEND_FAILURE_APOLOGY } from "./apology.ts";
import type { InboundUpdate } from "./telegram-transport.ts";

// Load repo-root .env exactly like scripts/qa/manual-smoke-slots.mjs — Node's
// built-in loader, no dotenv dependency (repo convention). Env already
// exported in the process wins; a missing .env is fine (rely on exported vars).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const envPath = path.join(repoRoot, ".env");
if (existsSync(envPath)) process.loadEnvFile(envPath);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is not set — copy .env.example to .env and fill it in`);
  }
  return value;
}

/**
 * Review-gate finding #4a (CRITICAL/MAJOR): grammY hands every inbound
 * update to `transport.onMessage`'s registered handler one at a time, with
 * no error boundary of its own by default — an uncaught exception from
 * `handleUpdate()` (a bug, a DB write failing, a Calendar/Anthropic call
 * throwing past `pipeline.ts`'s/`loop.ts`'s own recovery, etc.) would
 * otherwise either crash the whole long-polling process (killing the bot
 * for every OTHER lead too, not just the one whose update triggered it) or
 * silently stop the polling loop, per grammY's own default error handling.
 * This wrapper is the outermost boundary: it logs the failure server-side
 * and makes a best-effort attempt to send the lead a deterministic Ukrainian
 * apology (`TELEGRAM_SEND_FAILURE_APOLOGY`, reused rather than duplicated —
 * the exact copy already used for a Telegram-send failure, since from the
 * lead's point of view "something didn't get through" reads the same
 * either way). If even that best-effort send fails, it is logged and
 * swallowed — this boundary's whole point is that ONE failed update must
 * never take the process down (`@trace NFR-REL-01`).
 *
 * Deliberately NOT unit-tested here, same as `GrammyTelegramTransport`
 * itself (this file's own header comment): there is no update to safely
 * fail without a live grammY `Bot`/`TelegramTransport.onMessage` wiring.
 * The recoverable-failure PATHS this wrapper exists to catch (a Calendar
 * throw during cancel, a persistence write throwing) are unit-tested at
 * their actual source in `packages/agent/src/loop.test.ts` and
 * `packages/bot/src/pipeline.test.ts`; this function is the last-resort net
 * for anything that still gets past those.
 */
async function handleUpdateSafely(update: InboundUpdate, deps: HandleUpdateDeps): Promise<void> {
  try {
    await handleUpdate(update, deps);
  } catch (error) {
    console.error("Kamerton: unhandled error while processing an update", error);
    try {
      await deps.transport.sendMessage(update.telegramChatId, TELEGRAM_SEND_FAILURE_APOLOGY);
    } catch (sendError) {
      console.error("Kamerton: failed to send the fallback apology after an unhandled error", sendError);
    }
  }
}

async function main(): Promise<void> {
  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  const dbPath = process.env.KAMERTON_DB_PATH ?? path.join(repoRoot, "kamerton.db");

  const db = openDatabase(dbPath);
  const model = new AnthropicModelPort(); // ambient auth only (NFR-SEC-01)
  const calendar = new GoogleCalendarPort(); // reads GOOGLE_* from env
  const transport = new GrammyTelegramTransport(token);

  transport.onMessage((update) => handleUpdateSafely(update, { transport, db, model, calendar }));

  console.log(`Kamerton bot starting (long polling); db=${dbPath}`);
  await transport.start();
}

main().catch((error) => {
  console.error("Kamerton bot failed to start:", error);
  process.exitCode = 1;
});
