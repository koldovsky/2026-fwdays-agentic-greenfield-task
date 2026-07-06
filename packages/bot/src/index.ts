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
import { handleUpdate } from "./pipeline.ts";

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

async function main(): Promise<void> {
  const token = requireEnv("TELEGRAM_BOT_TOKEN");
  const dbPath = process.env.KAMERTON_DB_PATH ?? path.join(repoRoot, "kamerton.db");

  const db = openDatabase(dbPath);
  const model = new AnthropicModelPort(); // ambient auth only (NFR-SEC-01)
  const calendar = new GoogleCalendarPort(); // reads GOOGLE_* from env
  const transport = new GrammyTelegramTransport(token);

  transport.onMessage((update) => handleUpdate(update, { transport, db, model, calendar }));

  console.log(`Kamerton bot starting (long polling); db=${dbPath}`);
  await transport.start();
}

main().catch((error) => {
  console.error("Kamerton bot failed to start:", error);
  process.exitCode = 1;
});
