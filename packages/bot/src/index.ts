// @kamerton/bot — the runnable entrypoint (tasks.md 5.6). Long-polling
// grammY bot wired to the real production adapters:
//   • GrammyTelegramTransport  — Telegram I/O (long polling, NFR-LOCAL-01)
//   • ClaudeAgentModelPort      — the Claude tool-loop model (claude-sonnet-5).
//     This deployment authenticates with a subscription Claude Code OAuth
//     token (CLAUDE_CODE_OAUTH_TOKEN), which the raw Anthropic Messages API
//     (AnthropicModelPort, still kept for API-key deployments and the
//     tiny-real-Anthropic smoke) accepts but then rate-limits (HTTP 429) —
//     not a metered API key. The Claude Agent SDK instead spawns the local
//     `claude` CLI, which draws on the subscription's own allowance, so it
//     is the production choice here (see claude-agent-model-port.ts's
//     header for the full trace). auth resolves from the ambient
//     CLAUDE_CODE_OAUTH_TOKEN the CLI subprocess inherits — no API-key code
//     path here, NFR-SEC-01.
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
import { ClaudeAgentModelPort } from "@kamerton/agent/src/claude-agent-model-port.ts";
import { ensureAmbientAuthToken } from "@kamerton/agent/src/ambient-auth.ts";
import { GoogleCalendarPort } from "@kamerton/calendar";
import { GrammyTelegramTransport } from "./telegram-transport.ts";
import { handleUpdate, type HandleUpdateDeps } from "./pipeline.ts";
import { TELEGRAM_SEND_FAILURE_APOLOGY } from "./apology.ts";
import type { InboundUpdate } from "./telegram-transport.ts";
import { resolveAguiPublisher } from "./http-agui-publisher.ts";
import { drainNotifications } from "./notification-drain.ts";
import { drainQuestionDeliveries } from "./question-drain.ts";

/** Outbox drain cadence (booking-hitl design.md Decision 1: "a short-interval
 *  timer... a failed row is retried on the next tick, no backoff needed at
 *  single-teacher volume"). A few seconds is plenty responsive for a human
 *  reading the dashboard and a lead waiting in Telegram, without hammering
 *  SQLite or the Telegram API. */
const NOTIFICATION_DRAIN_INTERVAL_MS = 3000;

/** Answer-delivery drain cadence (kb-learning design.md Decision 2: a
 *  near-twin of the outbox drain above, on the same short-interval cadence —
 *  a few seconds is plenty responsive for a lead waiting on an admin's
 *  answer, without hammering SQLite or the Telegram API). */
const QUESTION_DRAIN_INTERVAL_MS = 3000;

// Load repo-root .env exactly like scripts/qa/manual-smoke-slots.mjs — Node's
// built-in loader, no dotenv dependency (repo convention). Env already
// exported in the process wins; a missing .env is fine (rely on exported vars).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const envPath = path.join(repoRoot, ".env");
if (existsSync(envPath)) process.loadEnvFile(envPath);

// Bridge the local Claude Code OAuth token onto the bearer var the SDK reads
// (NFR-SEC-01: local user token, never an API key). Warn but don't abort if
// absent — model turns then degrade to the deterministic apology (NFR-REL-01)
// rather than crashing, exactly as a real Anthropic outage would.
if (!ensureAmbientAuthToken()) {
  console.warn(
    "Warning: no Anthropic auth (ANTHROPIC_AUTH_TOKEN / CLAUDE_CODE_OAUTH_TOKEN) — " +
      "model turns will return the deterministic apology until auth is provided.",
  );
}

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
  // Agent SDK transport (see this file's header + claude-agent-model-port.ts's
  // header): spawns the local `claude` CLI, which draws on the subscription
  // OAuth token's own allowance instead of hitting the rate-limited raw API.
  const model = new ClaudeAgentModelPort(); // ambient auth only (NFR-SEC-01)
  const calendar = new GoogleCalendarPort(); // reads GOOGLE_* from env
  const transport = new GrammyTelegramTransport(token);
  // dashboard tasks.md §4.4: AGUI_INGEST_URL unset -> noopAguiPublisher
  // (no dashboard running, never a crash); set -> POSTs each AG-UI event to
  // it (e.g. http://127.0.0.1:3000/api/agui/ingest). A POST failure is
  // logged and swallowed inside the publisher itself (http-agui-publisher.ts),
  // and `pipeline.ts`'s own `safePublish` wrapper is a second safety net —
  // the bot keeps serving leads even with no dashboard listening.
  const publisher = resolveAguiPublisher();

  transport.onMessage((update) => handleUpdateSafely(update, { transport, db, model, calendar, publisher }));

  // Outbox drain (booking-hitl design.md Decision 1): fire-and-forget,
  // never awaited into startup — a rejected drain (e.g. a DB error) is
  // logged and swallowed here too, same NFR-REL-01 discipline as
  // `handleUpdateSafely` above, so one bad tick can never crash the
  // long-polling process. `drainNotifications` itself never throws for an
  // individual send failure (a bad row is simply retried next tick).
  //
  // Review-gate finding #2 [MAJOR] defense-in-depth: `drainNotifications`
  // itself already guards against double-sending the SAME row across two
  // overlapping calls (its own module-scoped in-flight claim), but a slow
  // tick whose `sendMessage` calls take longer than
  // `NOTIFICATION_DRAIN_INTERVAL_MS` would otherwise still spawn a second,
  // fully overlapping `drainNotifications` call on every subsequent tick —
  // wasted DB queries/Telegram calls piling up under a real outage/slowdown.
  // `isDraining` skips starting a new tick while the previous one is still
  // in flight, at the real-timer call site (not unit-tested here, same as
  // the rest of this file's own header comment: no live grammY/Telegram
  // wiring to safely exercise without a network).
  let isDrainingNotifications = false;
  setInterval(() => {
    if (isDrainingNotifications) return;
    isDrainingNotifications = true;
    drainNotifications(db, transport)
      .catch((error) => {
        console.error("Kamerton: notification drain tick failed", error);
      })
      .finally(() => {
        isDrainingNotifications = false;
      });
  }, NOTIFICATION_DRAIN_INTERVAL_MS);

  // Answer-delivery drain (kb-learning design.md Decision 2): a second,
  // independent timer alongside the notification drain above — its own
  // in-flight guard (`isDrainingQuestions`) and its own try/catch, so a bad
  // tick on EITHER drain never stops the other or crashes the long-polling
  // process (`@trace NFR-REL-01`). `drainQuestionDeliveries` itself never
  // throws for an individual send failure (that row is simply marked
  // `failed`; a manual retry via the dashboard, not this timer, ever
  // re-queues it — design.md Decision 2's manual-retry fork).
  let isDrainingQuestions = false;
  setInterval(() => {
    if (isDrainingQuestions) return;
    isDrainingQuestions = true;
    drainQuestionDeliveries(db, transport)
      .catch((error) => {
        console.error("Kamerton: question-answer drain tick failed", error);
      })
      .finally(() => {
        isDrainingQuestions = false;
      });
  }, QUESTION_DRAIN_INTERVAL_MS);

  console.log(`Kamerton bot starting (long polling); db=${dbPath}`);
  await transport.start();
}

main().catch((error) => {
  console.error("Kamerton bot failed to start:", error);
  process.exitCode = 1;
});
