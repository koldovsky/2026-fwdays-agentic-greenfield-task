// scripts/qa/seed-dashboard-fixture.mjs — S3 `dashboard` browser gate fixture
// seeder (tasks.md §7). Opens (creates) a SQLite DB at a given path via
// `@kamerton/db`'s `openDatabase()` (schema-idempotent) and, for
// `mode === "populated"`, inserts one lead + one active `requests` row
// (state `awaiting_admin`, ALL intake fields filled) plus three `bookings`
// rows for the CURRENT week (pending/confirmed/cancelled) so the dashboard's
// conversation panel, pending queue, and HallMap all have real data to
// render. `mode === "empty"` just creates the schema with zero rows.
//
// Usage: node scripts/qa/seed-dashboard-fixture.mjs <empty|populated> <dbPath>

import { openDatabase, insertLead, insertRequest, insertBooking, updateRequestState } from "@kamerton/db";

const [, , mode, dbPath] = process.argv;

if (mode !== "empty" && mode !== "populated") {
  console.error(`usage: node scripts/qa/seed-dashboard-fixture.mjs <empty|populated> <dbPath>`);
  process.exit(1);
}
if (!dbPath) {
  console.error(`usage: node scripts/qa/seed-dashboard-fixture.mjs <empty|populated> <dbPath>`);
  process.exit(1);
}

/** "YYYY-MM-DD" for this ISO week's Monday, Europe/Kyiv wall-clock "today" —
 *  same calendar-date arithmetic `week-grid.ts`/`dashboard-db.ts`'s
 *  `currentWeekStartIso` use (UTC-midnight-anchored, timezone-safe for a
 *  calendar date's weekday). */
function currentWeekMondayIso() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const map = {};
  for (const part of parts) if (part.type !== "literal") map[part.type] = part.value;
  const todayIso = `${map.year}-${map.month}-${map.day}`;

  const [y, m, d] = todayIso.split("-").map(Number);
  const baseMillis = Date.UTC(y, m - 1, d);
  const dow = new Date(baseMillis).getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const mondayMillis = baseMillis + offsetToMonday * 24 * 60 * 60 * 1000;
  const mondayDate = new Date(mondayMillis);
  const yy = mondayDate.getUTCFullYear();
  const mm = String(mondayDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(mondayDate.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** "YYYY-MM-DD" for `mondayIso` + `daysAfterMonday` days (0 = Monday). */
function dateOffset(mondayIso, daysAfterMonday) {
  const [y, m, d] = mondayIso.split("-").map(Number);
  const millis = Date.UTC(y, m - 1, d) + daysAfterMonday * 24 * 60 * 60 * 1000;
  const date = new Date(millis);
  const yy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Kyiv-offset "YYYY-MM-DDTHH:00:00+03:00" slot boundary string (matches
 *  `dashboard-state.ts`'s documented `bookings.slot_start`/`slot_end`
 *  shape). */
function slotIso(dateIso, hour) {
  return `${dateIso}T${String(hour).padStart(2, "0")}:00:00+03:00`;
}

const db = openDatabase(dbPath);

if (mode === "empty") {
  console.log(`seeded EMPTY fixture at ${dbPath} (schema only, zero rows)`);
  db.close();
  process.exit(0);
}

// mode === "populated"
const lead = insertLead(db, {
  telegramUserId: "qa-fixture-user-1",
  telegramChatId: "qa-fixture-chat-1",
  telegramDisplayName: "Софійка (QA fixture)",
});

const request = insertRequest(db, {
  leadId: lead.id,
  telegramChatId: lead.telegram_chat_id,
});

updateRequestState(db, request.id, "awaiting_admin");
db.prepare(
  `UPDATE requests SET
     student_name = @student_name,
     student_age = @student_age,
     format = @format,
     goal_tag = @goal_tag,
     goal_text = @goal_text,
     tastes = @tastes,
     dream_song = @dream_song,
     experience = @experience,
     comfort = @comfort,
     preferred_weekdays = @preferred_weekdays,
     preferred_time_range = @preferred_time_range
   WHERE id = @id`,
).run({
  id: request.id,
  student_name: "Софійка",
  student_age: 9,
  format: "individual",
  goal_tag: "hobby",
  goal_text: "Хоче співати для душі та на шкільних святах",
  tastes: "Українська естрада, мультиплікаційні пісні",
  dream_song: "\"Пісенька мамонтенка\"",
  experience: "Ніколи не займалась вокалом",
  comfort: "Трохи соромиться співати при незнайомих людях",
  preferred_weekdays: "Вт, Чт",
  preferred_time_range: "16:00-18:00",
});

const mondayIso = currentWeekMondayIso();

// pending booking: Tuesday (weekday=2 -> offset 1) 16:00, linked to the
// request above (amber HallMap seat + the pending queue's DecisionBar).
const pendingSlotDate = dateOffset(mondayIso, 1);
const pendingBooking = insertBooking(db, {
  slotStart: slotIso(pendingSlotDate, 16),
  slotEnd: slotIso(pendingSlotDate, 17),
  status: "pending",
  calendarEventId: "qa-fixture-calendar-event-pending",
});
db.prepare(`UPDATE bookings SET request_id = ? WHERE id = ?`).run(request.id, pendingBooking.id);

// confirmed booking: Wednesday (offset 2) 11:00 (green seat, different slot).
const confirmedSlotDate = dateOffset(mondayIso, 2);
insertBooking(db, {
  slotStart: slotIso(confirmedSlotDate, 11),
  slotEnd: slotIso(confirmedSlotDate, 12),
  status: "confirmed",
  calendarEventId: "qa-fixture-calendar-event-confirmed",
});

// cancelled booking: Thursday (offset 3) 14:00 (slate seat, third slot).
const cancelledSlotDate = dateOffset(mondayIso, 3);
insertBooking(db, {
  slotStart: slotIso(cancelledSlotDate, 14),
  slotEnd: slotIso(cancelledSlotDate, 15),
  status: "cancelled",
  calendarEventId: "qa-fixture-calendar-event-cancelled",
});

console.log(`seeded POPULATED fixture at ${dbPath}`);
console.log(`  lead.id=${lead.id} telegram_chat_id=${lead.telegram_chat_id}`);
console.log(`  request.id=${request.id} state=awaiting_admin`);
console.log(`  pending booking slot=${pendingSlotDate}T16:00 confirmed=${confirmedSlotDate}T11:00 cancelled=${cancelledSlotDate}T14:00`);

db.close();
