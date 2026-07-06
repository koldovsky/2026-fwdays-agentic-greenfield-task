#!/usr/bin/env node
// tasks.md 6.9 — the slice S2 `intake` manual real-DB smoke, scripted so it
// is rerunnable and its transcript is committable QA evidence
// (docs/qa/intake-manual-smoke.md). Mirrors S1's
// scripts/qa/manual-smoke-slots.mjs house style: numbered steps, PASS/FAIL
// checks, a summary line, temp DB under os.tmpdir cleaned up on exit.
//
// Documented deviations from the literal 6.9 text (agreed with the
// orchestrator before this run):
//  - step 2's "start the real bot against a real Telegram test chat" is
//    replaced by driving `handleUpdate()` (pipeline.ts) directly against a
//    `FakeTelegramTransport` — the SAME pipeline/state-machine/loop code the
//    production `GrammyTelegramTransport` wraps, minus the network. This
//    still exercises the real Claude Agent SDK -> local `claude` CLI ->
//    subscription-auth model round trip and the real on-disk SQLite file;
//    only the Telegram transport is a recording double (no bot token or
//    live chat needed, and the transport records outbound
//    typing/sendMessage calls in order for the NFR-UX-01 assertion).
//  - step 8 (reach `awaiting_admin` via S1's real DEMO-calendar hold path,
//    cancel, confirm the calendar event is deleted) and step 10 (break
//    ANTHROPIC_AUTH_TOKEN, confirm the apology) are DEFERRED: this pass
//    uses `FakeCalendarPort` (S1 precedent, `lib/src/slots/fake-calendar.ts`)
//    rather than the real DEMO calendar, because `propose_slots`/
//    `request_hold` are not yet wired from the agent-loop layer onto a
//    concrete `CalendarPort` call (see `packages/agent/src/loop.ts`'s own
//    header: "propose_slots/request_hold ... they need a CalendarPort seam
//    this contract does not expose, a later task") — live slot proposal and
//    the real-calendar hold/cancel lifecycle are S4's scope, not S2's. The
//    cancel scenario below (#5) still exercises the FULL `cancel_request`
//    orchestration code path (transition -> done, booking-release lookup,
//    `ports.releaseHold`/`markBookingCancelled` if a pending booking
//    exists) — it is simply a no-op release here because no booking was
//    ever created (no real hold to release), which the transcript notes
//    explicitly rather than silently. The auth-outage path (step 10) is
//    already unit-tested deterministically (`loop.test.ts`'s
//    `ports.model.send()`-rejects scenario) and is not repeated here against
//    a live token, to avoid interrupting the developer's real subscription
//    auth mid-run.
//  - The five scenarios actually driven (happy path, age-3 refusal, piano
//    detour, amend, cancel + returning lead) are the orchestrator-selected
//    subset of tasks.md 6.9's ten steps for this pass; steps 6 (off-topic
//    redirect) and 9 (already covered by the returning-lead scenario) are
//    folded in or deferred per the same instruction.
//
// The model is REAL (ClaudeAgentModelPort -> local `claude` CLI ->
// subscription auth) and therefore non-deterministic — every scripted lead
// message below is written to be UNAMBIGUOUS, and every field-collection
// step retries up to 2 additional times with a more explicit follow-up
// before a check is allowed to fail (tolerant assertions: state transitions
// + persisted-field presence + deterministic guardrail copy, never exact
// model wording).
//
// SECRETS: never logs credential values. Run with:
//   set -a && . ./.env && set +a && node scripts/qa/manual-smoke-intake.mjs
// (loads CLAUDE_CODE_OAUTH_TOKEN into the process env; ensureAmbientAuthToken()
// below bridges it onto ANTHROPIC_AUTH_TOKEN so the `claude` CLI subprocess
// inherits it).

import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  openDatabase,
  findLeadByTelegramUserId,
  findLatestRequestForLead,
} from "@kamerton/db";
import { ClaudeAgentModelPort } from "@kamerton/agent/src/claude-agent-model-port.ts";
import { ensureAmbientAuthToken } from "@kamerton/agent/src/ambient-auth.ts";
import { FakeCalendarPort } from "@kamerton/lib/src/slots/fake-calendar.ts";
import {
  AGE_REFUSAL_COPY,
  SCOPE_EXPLANATION_COPY,
} from "@kamerton/lib/src/intake/copy.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../..");
const envPath = path.join(repoRoot, ".env");
if (existsSync(envPath)) process.loadEnvFile(envPath);

const { FakeTelegramTransport } = await import(
  path.join(repoRoot, "packages/bot/src/testing/fake-telegram-transport.ts")
);
const { ANTHROPIC_PROCESSING_NOTICE } = await import(
  path.join(repoRoot, "packages/bot/src/copy.ts")
);
const { handleUpdate } = await import(path.join(repoRoot, "packages/bot/src/pipeline.ts"));

// ---------------------------------------------------------------------------
// transcript + check plumbing (mirrors manual-smoke-slots.mjs)
// ---------------------------------------------------------------------------
const transcriptLines = [];
const failures = [];
let totalModelCalls = 0;

function log(line = "") {
  console.log(line);
  transcriptLines.push(line);
}

function check(label, ok, detail = "") {
  const mark = ok ? "PASS" : "FAIL";
  log(`  [${mark}] ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(label);
}

function section(title) {
  log(`\n--- ${title} ---`);
}

// ---------------------------------------------------------------------------
// setup
// ---------------------------------------------------------------------------
log("=== 6.9 manual real-DB smoke (scripted) — S2 intake ===");

section("step 1: env + auth");
const hasAuth = ensureAmbientAuthToken();
check(
  "some Anthropic auth signal present (CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_AUTH_TOKEN/API_KEY)",
  hasAuth,
);
if (!hasAuth) {
  log("  cannot continue without auth — aborting.");
  process.exit(1);
}

section("step 2: clean SQLite + updated schema");
const dbDir = mkdtempSync(path.join(tmpdir(), "kamerton-intake-smoke-"));
const dbPath = path.join(dbDir, "smoke.db");
const db = openDatabase(dbPath);
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table'")
  .all()
  .map((r) => r.name);
check("leads table created from clean file", tables.includes("leads"), tables.join(","));
check("requests table created from clean file", tables.includes("requests"), tables.join(","));
const bookingsColumns = db
  .prepare("PRAGMA table_info(bookings)")
  .all()
  .map((c) => c.name);
check(
  "bookings.request_id column present (S2 adds it once requests exists)",
  bookingsColumns.includes("request_id"),
  bookingsColumns.join(","),
);

const model = new ClaudeAgentModelPort();
const calendar = new FakeCalendarPort();

function makeDeps() {
  return { transport: new FakeTelegramTransport(), db, model, calendar };
}

function getRow(telegramUserId) {
  const lead = findLeadByTelegramUserId(db, telegramUserId);
  if (lead === undefined) return undefined;
  return findLatestRequestForLead(db, lead.id);
}

function allRequestsForLead(telegramUserId) {
  const lead = findLeadByTelegramUserId(db, telegramUserId);
  if (lead === undefined) return [];
  return db.prepare("SELECT * FROM requests WHERE lead_id = ? ORDER BY id ASC").all(lead.id);
}

function bookingCountForRequest(requestId) {
  return db.prepare("SELECT COUNT(*) AS c FROM bookings WHERE request_id = ?").get(requestId).c;
}

/** Drives one turn through the real pipeline, logging the lead's message and
 *  every outbound call (chat action / reply) the transport recorded for
 *  JUST this turn. Returns that turn's recorded calls. */
async function sendTurn(deps, update, label) {
  if (update.type === "text") totalModelCalls += 1;
  const before = deps.transport.calls.length;
  log(`  -> ${label}`);
  log(`     лід (${update.telegramUserId}): "${update.text}"`);
  await handleUpdate(update, deps);
  const turnCalls = deps.transport.calls.slice(before);
  for (const call of turnCalls) {
    if (call.kind === "sendChatAction") {
      log(`     [chat action] ${call.action}`);
    } else {
      log(`     [bot reply] ${call.text.replace(/\n/g, " / ")}`);
    }
  }
  return turnCalls;
}

function replyTextOf(turnCalls) {
  return turnCalls
    .filter((c) => c.kind === "sendMessage")
    .map((c) => c.text)
    .join(" ");
}

/** Sends up to `candidates.length` explicit variants of a lead message (a
 *  first attempt plus up to 2 more-explicit retries) until `predicate(row)`
 *  holds against the freshly-read `requests` row for `telegramUserId`, or
 *  gives up and fails the check with the last-seen row for diagnosis. */
async function driveUntilField(deps, identity, candidates, predicate, label) {
  let row;
  let turnCalls;
  for (let i = 0; i < candidates.length; i += 1) {
    turnCalls = await sendTurn(
      deps,
      { type: "text", ...identity, text: candidates[i] },
      `${label} — спроба ${i + 1}/${candidates.length}`,
    );
    row = getRow(identity.telegramUserId);
    if (row !== undefined && predicate(row)) {
      check(label, true, `на спробі ${i + 1}`);
      return { row, turnCalls };
    }
  }
  check(label, false, `не досягнуто після ${candidates.length} спроб — рядок: ${JSON.stringify(row)}`);
  return { row, turnCalls };
}

/** Same retry shape as `driveUntilField`, but the predicate checks the
 *  turn's REPLY TEXT instead of the persisted row (used for the piano-detour
 *  scenario, where the deterministic guardrail copy — not a field — is the
 *  observable proxy for the scope-violation detour firing). */
async function driveUntilReply(deps, identity, candidates, predicate, label) {
  let turnCalls;
  let replyText = "";
  for (let i = 0; i < candidates.length; i += 1) {
    turnCalls = await sendTurn(
      deps,
      { type: "text", ...identity, text: candidates[i] },
      `${label} — спроба ${i + 1}/${candidates.length}`,
    );
    replyText = replyTextOf(turnCalls);
    if (predicate(replyText)) {
      check(label, true, `на спробі ${i + 1}`);
      return { turnCalls, replyText };
    }
  }
  check(label, false, `не досягнуто після ${candidates.length} спроб — остання відповідь: "${replyText}"`);
  return { turnCalls, replyText };
}

// ---------------------------------------------------------------------------
// scenario 1 — happy path
// ---------------------------------------------------------------------------
section("scenario 1: happy path (smoke-happy)");
{
  const deps = makeDeps();
  const identity = {
    telegramUserId: "smoke-happy",
    telegramChatId: "smoke-happy-chat",
    telegramDisplayName: "Марина (смоук-хепі-пас)",
  };

  const greetingCalls = await sendTurn(
    deps,
    { type: "text", ...identity, text: "Доброго дня! Хочу записати дитину на вокал." },
    "привітання (нова лідка)",
  );
  check(
    "typing chat action recorded BEFORE the reply (NFR-UX-01)",
    greetingCalls.length >= 2 &&
      greetingCalls[0].kind === "sendChatAction" &&
      greetingCalls[0].action === "typing" &&
      greetingCalls.some((c) => c.kind === "sendMessage"),
    greetingCalls.map((c) => c.kind).join(" -> "),
  );
  check(
    "first-ever reply to a brand-new lead carries the Anthropic-processing notice (NFR-PRIV-02)",
    replyTextOf(greetingCalls).includes(ANTHROPIC_PROCESSING_NOTICE),
  );

  await driveUntilField(
    deps,
    identity,
    [
      "Доньку звати Софійка.",
      "Уточню ім'я дитини ще раз: Софійка.",
      "Ім'я учениці для запису: Софійка (саме так, будь ласка запишіть).",
    ],
    (row) => row.student_name !== null && row.student_name.length > 0,
    "ім'я учениці збережено (student_name)",
  );

  await driveUntilField(
    deps,
    identity,
    [
      "Їй 9 років.",
      "Уточню вік ще раз: дитині виповнилося 9 років, це число 9.",
      "Вік для запису: 9.",
    ],
    (row) => row.student_age === 9,
    "вік учениці збережено (student_age = 9)",
  );

  const { row: afterFormat } = await driveUntilField(
    deps,
    identity,
    [
      "Хочемо індивідуальні заняття, будь ласка.",
      "Уточню формат ще раз: обираємо індивідуальний формат занять, не груповий.",
      "Формат для запису: індивідуальні заняття.",
    ],
    (row) => row.format === "individual",
    "формат занять збережено (format = individual)",
  );
  check(
    "qualifying auto-advances to profiling once name+age+format are all present",
    afterFormat !== undefined && afterFormat.state === "profiling",
    `state=${afterFormat?.state}`,
  );

  await driveUntilField(
    deps,
    identity,
    [
      "Мета занять — готуватися до виступів на шкільних концертах.",
      "Уточню мету ще раз: хочемо готуватися саме до виступів на сцені.",
      "Мета для запису: виступи.",
    ],
    (row) => row.goal_tag !== null || row.goal_text !== null,
    "мета занять збережена (goal_tag/goal_text)",
  );

  await driveUntilField(
    deps,
    identity,
    [
      "Дитина любить сучасну українську музику, мріє заспівати щось із репертуару Океану Ельзи.",
      "Уточню музичні смаки ще раз: сучасна українська музика, мрія-пісня — Океан Ельзи.",
      "Смаки для запису: українська естрада.",
    ],
    (row) => row.tastes !== null,
    "музичні смаки збережено (tastes)",
  );

  const { row: afterExperience } = await driveUntilField(
    deps,
    identity,
    [
      "Досвіду співу немає, це буде перший раз, але вона зовсім не соромиться виступати перед людьми.",
      "Уточню ще раз: досвіду немає, перший раз, почувається комфортно на сцені, не соромиться.",
      "Досвід для запису: немає. Комфорт для запису: почувається впевнено.",
    ],
    (row) => row.experience !== null && row.comfort !== null,
    "досвід і комфорт збережено (experience, comfort)",
  );
  check(
    "profiling auto-advances to collecting once experience+comfort are present",
    afterExperience !== undefined && afterExperience.state === "collecting",
    `state=${afterExperience?.state}`,
  );

  await driveUntilField(
    deps,
    identity,
    [
      "Зручні дні — вівторок і четвер.",
      "Уточню дні тижня ще раз: вівторок та четвер.",
      "Дні для запису: вт, чт.",
    ],
    (row) => row.preferred_weekdays !== null,
    "бажані дні тижня збережено (preferred_weekdays)",
  );

  const { row: afterTimeRange } = await driveUntilField(
    deps,
    identity,
    [
      "Бажаний час — з 16:00 до 18:00.",
      "Уточню часовий проміжок ще раз: з 16:00 до 18:00.",
      "Час для запису: 16:00-18:00.",
    ],
    (row) => row.preferred_time_range !== null,
    "бажаний час збережено (preferred_time_range)",
  );
  check(
    "collecting auto-advances to proposing once weekdays+time range are present " +
      "(live slot proposal itself is S4 scope — FakeCalendarPort is not wired to propose_slots yet, deferred)",
    afterTimeRange !== undefined && afterTimeRange.state === "proposing",
    `state=${afterTimeRange?.state}`,
  );
}

// ---------------------------------------------------------------------------
// scenario 2 — age-3 refusal
// ---------------------------------------------------------------------------
section("scenario 2: age-3 refusal (smoke-age3)");
{
  const deps = makeDeps();
  const identity = {
    telegramUserId: "smoke-age3",
    telegramChatId: "smoke-age3-chat",
    telegramDisplayName: "Оксана (смоук-вік-3)",
  };

  await sendTurn(
    deps,
    { type: "text", ...identity, text: "Доброго дня, хочу записати доньку на вокал." },
    "привітання (нова лідка)",
  );

  await driveUntilField(
    deps,
    identity,
    ["Доньку звати Марійка.", "Уточню ім'я ще раз: Марійка.", "Ім'я для запису: Марійка."],
    (row) => row.student_name !== null,
    "ім'я учениці збережено (student_name)",
  );

  // NOTE (accommodating real model non-determinism, probed separately before
  // this script's final form): a plain "Їй 3 роки." sometimes makes the
  // model narrate the under-4 refusal ITSELF (from the STATIC_SYSTEM_PROMPT's
  // own "Under-4 -> refuse" voice rule) WITHOUT ever calling `save_age` —
  // which means the deterministic reducer/guardrail never actually fires
  // (state stays "qualifying", not "soft_decline"). An explicit
  // "please record/save this" framing reliably pushes the model back onto
  // the tool-call path so the DETERMINISTIC guardrail (not the model's own
  // narration) is what is actually being exercised here — seen this
  // reliably fire `save_age` in pre-flight probing. This is itself a real,
  // if lower-severity, finding: reported in the final QA summary, not
  // papered over by relaxing what this check asserts.
  const { row: afterAge, turnCalls } = await driveUntilField(
    deps,
    identity,
    [
      "Їй 3 роки.",
      "Уточнюю: дитині 3 роки — будь ласка, запиши цей вік.",
      "Мені важливо, щоб цей вік зберігся в анкеті: дитині 3 роки, збережи це значення, будь ласка.",
    ],
    (row) => row.state === "soft_decline",
    "age-3 guardrail fires — requests.state = soft_decline",
  );
  check(
    "reply contains the deterministic AGE_REFUSAL_COPY (guardrail copy always wins over narration)",
    replyTextOf(turnCalls ?? []).includes(AGE_REFUSAL_COPY),
  );
  check(
    "no bookings row exists for this lead's request",
    afterAge !== undefined && bookingCountForRequest(afterAge.id) === 0,
  );
}

// ---------------------------------------------------------------------------
// scenario 3 — piano detour, then resume
// ---------------------------------------------------------------------------
// KNOWN REAL FINDING (pre-flight-probed, reproduced 6/6 across independent
// probes, not model noise): for a mid-qualifying piano question, the real
// model consistently calls the purpose-built `explain_scope` tool, never
// `save_format({format:"instrument"})` — a perfectly reasonable model
// choice given the tool set, but `explain_scope` is dispatched by
// `packages/agent/src/loop.ts`'s `applyToolUse` as a bare "pass_through"
// (never reaches `transition()`, carries no `detour`) and the model's
// accompanying text is empty, so `pipeline.ts` falls back to the generic
// `EMPTY_NARRATION_FALLBACK_COPY` ("Дякую, я це записала.") — NOT
// `SCOPE_EXPLANATION_COPY`. The lead never sees the voice-only scope
// explanation this flow is supposed to guarantee, and is misleadingly told
// something was "recorded" when nothing was. This check is left exactly as
// spec'd (asserting the real guardrail copy) and is EXPECTED to fail here
// until `pipeline.ts`/`loop.ts` wire a deterministic reply for
// `explain_scope`/`explain_format` pass-through outcomes — reported as a
// finding, not papered over.
section("scenario 3: piano detour then resume (smoke-piano)");
{
  const deps = makeDeps();
  const identity = {
    telegramUserId: "smoke-piano",
    telegramChatId: "smoke-piano-chat",
    telegramDisplayName: "Тарас (смоук-піаніно)",
  };

  await sendTurn(
    deps,
    { type: "text", ...identity, text: "Добрий день, цікавить запис на заняття для сина." },
    "привітання (нова лідка)",
  );

  await driveUntilField(
    deps,
    identity,
    ["Сина звати Тарасик.", "Уточню ім'я ще раз: Тарасик.", "Ім'я для запису: Тарасик."],
    (row) => row.student_name !== null,
    "ім'я учня збережено (student_name)",
  );

  await driveUntilField(
    deps,
    identity,
    ["Йому 8 років.", "Уточню вік ще раз: дитині 8 років, число 8.", "Вік для запису: 8."],
    (row) => row.student_age === 8,
    "вік учня збережено (student_age = 8)",
  );

  const rowBeforeDetour = getRow(identity.telegramUserId);
  await driveUntilReply(
    deps,
    identity,
    [
      "Ми взагалі хотіли б заняття гри на фортепіано для нього, а не вокал.",
      "Уточню ще раз: нас цікавить саме фортепіано, гра на інструменті, а не спів.",
      "Питання: чи можна записатися на уроки фортепіано (інструмент, не вокал)?",
    ],
    (replyText) => replyText.includes(SCOPE_EXPLANATION_COPY),
    "voice-only scope explanation fires (SCOPE_EXPLANATION_COPY, deterministic guardrail copy)",
  );
  const rowAfterDetour = getRow(identity.telegramUserId);
  check(
    "requests.state unchanged by the detour (still qualifying, format not advanced)",
    rowAfterDetour !== undefined &&
      rowAfterDetour.state === rowBeforeDetour.state &&
      rowAfterDetour.format === null,
    `before=${rowBeforeDetour.state} after=${rowAfterDetour?.state} format=${rowAfterDetour?.format}`,
  );

  await driveUntilField(
    deps,
    identity,
    [
      "Гаразд, спробуємо вокал — індивідуальні заняття, будь ласка.",
      "Домовились, обираємо індивідуальний формат занять з вокалу для сина.",
      "Формат для запису: індивідуальні (вокал).",
    ],
    (row) => row.format === "individual",
    "resumes normally after the detour — format saved (format = individual)",
  );
}

// ---------------------------------------------------------------------------
// scenario 4 — amend a field mid-flow
// ---------------------------------------------------------------------------
// KNOWN REAL FINDING (pre-flight-probed, reproduced 6/6 across independent
// probes, not model noise): for an age-correction phrased ANY of several
// natural ways, the real model's `amend_field` tool call consistently sends
// `value: "7"` — a JSON STRING, not a JSON number (`tools.ts`'s
// `amend_field.input_schema.properties.value` has no `type` constraint, so
// the API never rejects this). `lib/src/intake/age.ts`'s `validateAge`'s own
// defensive `typeof age !== "number"` guard (added specifically to catch a
// genuinely-malformed value) then treats this perfectly valid age as
// "AGE_BELOW_MIN", incorrectly driving the lead to a terminal
// `soft_decline` for CORRECTING their child's age to a valid value. This is
// a CRITICAL, 100%-reproducible finding (confirmed even when the scripted
// message explicitly said "as a number, not a string") — this check is left
// exactly as spec'd and is EXPECTED to fail here until the amend path
// coerces/validates the tool's raw value type before calling `validateAge`.
section("scenario 4: amend age mid-flow (smoke-amend)");
{
  const deps = makeDeps();
  const identity = {
    telegramUserId: "smoke-amend",
    telegramChatId: "smoke-amend-chat",
    telegramDisplayName: "Наталя (смоук-виправлення)",
  };

  await sendTurn(
    deps,
    { type: "text", ...identity, text: "Доброго дня, хочу записати дитину." },
    "привітання (нова лідка)",
  );

  await driveUntilField(
    deps,
    identity,
    ["Дитину звати Іванка.", "Уточню ім'я ще раз: Іванка.", "Ім'я для запису: Іванка."],
    (row) => row.student_name !== null,
    "ім'я збережено (student_name)",
  );

  await driveUntilField(
    deps,
    identity,
    ["Їй 6 років.", "Уточню вік ще раз: дитині 6 років, число 6.", "Вік для запису: 6."],
    (row) => row.student_age === 6,
    "початковий вік збережено (student_age = 6)",
  );

  await driveUntilField(
    deps,
    identity,
    [
      "Групові заняття, будь ласка.",
      "Уточню формат ще раз: груповий формат занять.",
      "Формат для запису: групові.",
    ],
    (row) => row.format === "group",
    "формат збережено (format = group)",
  );

  await driveUntilField(
    deps,
    identity,
    [
      "Перепрошую, я помилилася — дитині насправді 7 років, а не 6.",
      "Виправлення: вік дитини потрібно змінити на 7, а не 6, будь ласка онови запис.",
      "Виправ вік на число 7 (саме число, не рядок).",
    ],
    (row) => row.student_age === 7,
    "amend_field виправляє вік (student_age: 6 -> 7)",
  );
}

// ---------------------------------------------------------------------------
// scenario 5 — cancel, then a returning lead starts a NEW request row
// ---------------------------------------------------------------------------
section("scenario 5: cancel + returning lead (smoke-return)");
{
  const deps = makeDeps();
  const identity = {
    telegramUserId: "smoke-return",
    telegramChatId: "smoke-return-chat",
    telegramDisplayName: "Ірина (смоук-повернення)",
  };

  await sendTurn(
    deps,
    { type: "text", ...identity, text: "Доброго дня, хочу записати дитину на вокал." },
    "привітання (нова лідка)",
  );

  await driveUntilField(
    deps,
    identity,
    ["Дитину звати Оленка.", "Уточню ім'я ще раз: Оленка.", "Ім'я для запису: Оленка."],
    (row) => row.student_name !== null,
    "ім'я збережено (student_name)",
  );

  await driveUntilField(
    deps,
    identity,
    ["Їй 10 років.", "Уточню вік ще раз: дитині 10 років, число 10.", "Вік для запису: 10."],
    (row) => row.student_age === 10,
    "вік збережено (student_age = 10)",
  );

  await driveUntilField(
    deps,
    identity,
    [
      "Індивідуальні заняття, будь ласка.",
      "Уточню формат ще раз: індивідуальний формат занять.",
      "Формат для запису: індивідуальні.",
    ],
    (row) => row.format === "individual",
    "формат збережено (format = individual)",
  );

  const { row: cancelledRow } = await driveUntilField(
    deps,
    identity,
    [
      "Перепрошую, ми хочемо скасувати заявку.",
      "Скасуйте, будь ласка, нашу заявку — ми передумали.",
      "Відміна заявки, дякую, більше не потрібно.",
    ],
    (row) => row.state === "done",
    "cancel_request доводить розмову до термінального стану done",
  );

  await sendTurn(
    deps,
    {
      type: "text",
      ...identity,
      text: "Доброго дня знову! Тепер хочемо записати ще одну дитину на вокал.",
    },
    "той самий telegramUserId пише знову після термінального стану",
  );

  const allRequests = allRequestsForLead(identity.telegramUserId);
  check(
    "a SECOND requests row was created for the same lead (FR-INTAKE-08)",
    allRequests.length === 2,
    `requests rows: ${allRequests.length}`,
  );
  const firstRow = allRequests.find((r) => r.id === cancelledRow.id);
  check(
    "the FIRST (cancelled) request row is untouched — still done, same student_name",
    firstRow !== undefined &&
      firstRow.state === "done" &&
      firstRow.student_name === cancelledRow.student_name,
    `state=${firstRow?.state} student_name=${firstRow?.student_name}`,
  );
  const secondRow = allRequests.find((r) => r.id !== cancelledRow.id);
  check(
    "the SECOND request row is a fresh row (new id, starts at greeting, no student_name yet)",
    secondRow !== undefined && secondRow.id > cancelledRow.id && secondRow.student_name === null,
    `id=${secondRow?.id} state=${secondRow?.state} student_name=${secondRow?.student_name}`,
  );
}

// ---------------------------------------------------------------------------
// cleanup + summary
// ---------------------------------------------------------------------------
section("cleanup");
db.close();
rmSync(dbDir, { recursive: true, force: true });
log("  temp db removed");

log(
  failures.length === 0
    ? "\n=== 6.9 SMOKE PASSED (all checks) ==="
    : `\n=== 6.9 SMOKE FAILED: ${failures.length} check(s): ${failures.join("; ")} ===`,
);
log(`(${totalModelCalls} real model round trips made via ClaudeAgentModelPort in this run)`);

// ---------------------------------------------------------------------------
// write the transcript doc (rerunnable — regenerated fresh every run, same
// convention as docs/qa/slots-manual-smoke.md)
// ---------------------------------------------------------------------------
const generatedAt = new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" });
const docPath = path.join(repoRoot, "docs/qa/intake-manual-smoke.md");

const KNOWN_FINDINGS = [
  {
    matches: (f) => f.includes("voice-only scope explanation"),
    severity: "MAJOR",
    text:
      'For a mid-qualifying piano question, the real model consistently calls the purpose-built ' +
      '`explain_scope` tool (confirmed 6/6 across pre-flight probes with varied phrasing), never ' +
      '`save_format({format:"instrument"})`. `packages/agent/src/loop.ts`\'s `applyToolUse` dispatches ' +
      '`explain_scope` as a bare "pass_through" (never reaches `transition()`, carries no `detour`), and ' +
      "the model's accompanying text is empty, so `pipeline.ts` falls back to the generic " +
      '`EMPTY_NARRATION_FALLBACK_COPY` ("Дякую, я це записала.") instead of the intended ' +
      "`SCOPE_EXPLANATION_COPY`. A real lead asking about piano this way is told something was " +
      '"recorded" when nothing was, and never receives the voice-only scope explanation ' +
      "(BC-SCOPE-01/02). Fix: wire a deterministic reply for `explain_scope`/`explain_format` " +
      "pass-through outcomes in `pipeline.ts`'s guardrail-override logic.",
  },
  {
    matches: (f) => f.includes("amend_field виправляє вік"),
    severity: "CRITICAL",
    text:
      "For an age correction phrased several natural ways — including one explicitly telling the model " +
      '"as a number, not a string" — the real model\'s `amend_field` tool call consistently sends ' +
      '`value: "7"` (a JSON STRING, not a JSON number; confirmed 6/6 across pre-flight probes). ' +
      "`packages/agent/src/tools.ts`'s `amend_field.input_schema.properties.value` has no `type` " +
      "constraint, so the Anthropic API never rejects this. `lib/src/intake/age.ts`'s `validateAge`'s " +
      "own defensive `typeof age !== \"number\"` guard (added to catch a genuinely malformed value) " +
      'then treats this perfectly valid age as `AGE_BELOW_MIN`, incorrectly driving the lead to a ' +
      "terminal `soft_decline` (fields wiped) for CORRECTING their child's age to a valid value. " +
      "This is 100% reproducible, not model noise. Fix: coerce/parse the raw tool-call value to a " +
      "number before calling `validateAge` in the `amend` path (`lib/src/intake/state-machine.ts`), " +
      "the same way a first-time `save_age` call already relies on the tool schema's `type: integer`.",
  },
];

const activeFindings = KNOWN_FINDINGS.filter((f) => failures.some(f.matches));
const findingsSection =
  activeFindings.length === 0
    ? ""
    : `\n## Known findings from this run (real, reproducible — not script flakiness)\n\n${activeFindings
        .map((f, i) => `${i + 1}. **[${f.severity}]** ${f.text}`)
        .join("\n\n")}\n`;

const doc = `# S2 \`intake\` — 6.9 manual real-DB smoke transcript

> Generated by \`node scripts/qa/manual-smoke-intake.mjs\` (rerunnable) on ${generatedAt}, Europe/Kyiv.
>
> Transport: the REAL pipeline (\`packages/bot/src/pipeline.ts\`'s \`handleUpdate\`) driven with the
> REAL model transport (\`ClaudeAgentModelPort\` -> the local \`claude\` CLI -> the developer's
> subscription auth, \`packages/agent/src/claude-agent-model-port.ts\`) against a REAL on-disk
> SQLite file (\`openDatabase\`, a fresh temp file per run). \`FakeTelegramTransport\` records
> outbound typing/sendMessage calls instead of a live Telegram chat (no bot token or network
> needed) and \`FakeCalendarPort\` stands in for the DEMO Google Calendar — S2 \`intake\` does not
> yet wire \`propose_slots\`/\`request_hold\` onto a concrete calendar call (that is S4's scope,
> per \`packages/agent/src/loop.ts\`'s own header), so this smoke does not exercise live slot
> proposals or a real calendar hold — the "collecting -> proposing" state transition is asserted,
> not the slot list itself.
>
> Every lead message is REAL, non-deterministic model output territory: the script writes
> unambiguous scripted lead messages and retries up to 2 more-explicit variants per field before
> failing a check (tolerant assertions on state transitions / persisted-field presence /
> deterministic guardrail copy — never exact model wording).
>
> Deviations from the literal 6.9 text and which of its 10 steps this pass covers are documented
> in this script's own header comment (\`scripts/qa/manual-smoke-intake.mjs\`).
${findingsSection}
\`\`\`
${transcriptLines.join("\n")}
\`\`\`
`;
writeFileSync(docPath, doc, "utf8");
log(`\ntranscript written to ${path.relative(repoRoot, docPath)}`);

process.exit(failures.length === 0 ? 0 : 1);
