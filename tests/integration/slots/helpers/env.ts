// tests/integration/slots — shared real-DEMO-calendar test infra
// (tasks.md 5.3-5.5). This is the ONLY place these integration tests load
// `.env` or build a `GoogleCalendarPort` — same env-loading approach as
// packages/calendar/src/smoke.mjs (Node's built-in `process.loadEnvFile`;
// `dotenv` is NOT a dependency of the root/lib/packages workspaces, only
// pulled in transitively by @kamerton/bot, so we do not add it here).
//
// SECRETS DISCIPLINE: never log `.env` contents or the service-account JSON
// key file's contents — only ever log booleans ("is it set"), same
// discipline as smoke.mjs.

import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleCalendarPort, type GoogleCalendarPortOptions } from "@kamerton/calendar";

const here = path.dirname(fileURLToPath(import.meta.url));
// tests/integration/slots/helpers/ -> repo root is four levels up.
const repoRoot = path.resolve(here, "../../../..");

let envLoaded = false;

/**
 * Idempotent `.env` load (vitest may import several test files, and this
 * module, into the same worker). Safe to call from every helper/test file's
 * module scope.
 */
export function loadRootEnv(): void {
  if (envLoaded) return;
  envLoaded = true;
  const envPath = path.join(repoRoot, ".env");
  if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
  } else {
    console.warn(
      `[tests/integration/slots] no .env found at ${envPath} — relying on already-exported env vars`,
    );
  }
}

/**
 * Namespace every test-created calendar event's summary carries, so cleanup
 * can find (and a rerun can recognise/remove) leftovers without ever
 * touching an event a human created on the DEMO calendar.
 */
export const ITEST_PREFIX = "[itest-slots]";

/**
 * Reads a required env var (after ensuring `.env` is loaded), throwing a
 * clear error rather than letting a `GoogleCalendarPort` constructor fail
 * with a less specific message when it's missing.
 */
export function requireEnv(name: "GOOGLE_CALENDAR_ID" | "GOOGLE_APPLICATION_CREDENTIALS"): string {
  loadRootEnv();
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `[tests/integration/slots] ${name} is not set (see .env.example). These tests run ` +
        "against the REAL DEMO Google Calendar and require real credentials.",
    );
  }
  return value;
}

/**
 * Builds the production `GoogleCalendarPort` against the real DEMO
 * calendar, using `.env`'s credentials/calendar id unless `overrides`
 * supplies its own (task 5.4 overrides `keyFile` with a deliberately broken
 * path via this parameter — it never mutates the real `.env` file or
 * `process.env`).
 */
export function buildGoogleCalendarPort(overrides: GoogleCalendarPortOptions = {}): GoogleCalendarPort {
  loadRootEnv();
  return new GoogleCalendarPort(overrides);
}
