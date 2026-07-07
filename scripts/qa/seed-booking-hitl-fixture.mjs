// scripts/qa/seed-booking-hitl-fixture.mjs — booking-hitl S4 rendered-UI
// gate fixture seeder (tasks.md §I). Adapted from
// `scripts/qa/seed-dashboard-fixture.mjs`'s "populated" mode (S3), which
// already produces exactly the shape this gate needs: one `awaiting_admin`
// request with ALL intake fields filled backing a `pending` booking (so a
// real `RequestCard` renders the real `DecisionBar` with all three actions
// AND `candidateProposalSlots` — this week's 50-seat grid minus the
// pending+confirmed seats below — yields plenty of on-grid, selectable
// candidates for the inline "Propose another time" slot-picker), one
// `confirmed` seat, and one `cancelled` seat, all on DIFFERENT weekdays/
// hours so the HallMap shows three distinct, unambiguous seat colors.
//
// "Deterministic, no Date.now() noise": the Monday of the target week is
// resolved ONCE (`weekMondayIso`, below) and every other date is pure
// offset arithmetic from that single value — never a second independent
// `new Date()` call. The target week itself still has to be the REAL
// current week (Europe/Kyiv wall-clock "today"), because the running
// dashboard's own server-side read (`apps/dashboard/lib/dashboard-db.ts`'s
// `currentWeekStartIso()`) always resolves "this week" from the real clock
// at request time — there is no env-var seam to override that in the
// running app, so a truly fixed calendar week would silently show an EMPTY
// HallMap instead. `QA_FIXTURE_TODAY` (an optional "YYYY-MM-DD" override)
// lets a caller pin an exact day for local reproducibility/debugging; it is
// unset by default, so normal runs track the real day exactly once.
//
// Usage: node scripts/qa/seed-booking-hitl-fixture.mjs <dbPath>

import { openDatabase, insertLead, insertRequest, insertBooking, updateRequestState } from "@kamerton/db";

const [, , dbPath] = process.argv;

if (!dbPath) {
  console.error(`usage: node scripts/qa/seed-booking-hitl-fixture.mjs <dbPath>`);
  process.exit(1);
}

/** "YYYY-MM-DD" for `referenceDate`'s ISO week's Monday, Europe/Kyiv
 *  wall-clock "today" (same UTC-midnight-anchored calendar-date arithmetic
 *  `week-grid.ts`/`dashboard-db.ts` use — a calendar date's weekday does
 *  not depend on a timezone). Resolves `referenceDate` exactly once. */
function weekMondayIso(referenceDate) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(referenceDate);
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
 *  `bookings.slot_start`/`slot_end`'s documented write contract). */
function slotIso(dateIso, hour) {
  return `${dateIso}T${String(hour).padStart(2, "0")}:00:00+03:00`;
}

const referenceDate = process.env.QA_FIXTURE_TODAY ? new Date(`${process.env.QA_FIXTURE_TODAY}T12:00:00Z`) : new Date();
const mondayIso = weekMondayIso(referenceDate);

const db = openDatabase(dbPath);

const lead = insertLead(db, {
  telegramUserId: "qa-booking-hitl-user-1",
  telegramChatId: "qa-booking-hitl-chat-1",
  telegramDisplayName: "Тарасик (QA fixture)",
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
  student_name: "Тарасик",
  student_age: 12,
  format: "individual",
  goal_tag: "hobby",
  goal_text: "Хоче навчитись співати для шкільного гурту",
  tastes: "Рок, українська альтернатива",
  dream_song: "\"Танці\" — Океан Ельзи",
  experience: "Займався в шкільному хорі рік тому",
  comfort: "Почувається впевнено на сцені",
  preferred_weekdays: "Пн, Ср",
  preferred_time_range: "17:00-19:00",
});

// pending booking: Tuesday (offset 1) 16:00 — the DecisionBar's own request,
// still selectable as a HallMap "pending" (amber) seat.
const pendingSlotDate = dateOffset(mondayIso, 1);
const pendingBooking = insertBooking(db, {
  slotStart: slotIso(pendingSlotDate, 16),
  slotEnd: slotIso(pendingSlotDate, 17),
  status: "pending",
  calendarEventId: "qa-fixture-booking-hitl-pending",
});
db.prepare(`UPDATE bookings SET request_id = ? WHERE id = ?`).run(request.id, pendingBooking.id);

// confirmed seat: Wednesday (offset 2) 11:00 (green), unrelated to the
// pending request — proves the HallMap's "confirmed" precedence.
const confirmedSlotDate = dateOffset(mondayIso, 2);
insertBooking(db, {
  slotStart: slotIso(confirmedSlotDate, 11),
  slotEnd: slotIso(confirmedSlotDate, 12),
  status: "confirmed",
  calendarEventId: "qa-fixture-booking-hitl-confirmed",
});

// cancelled (superseded) seat: Thursday (offset 3) 14:00 (slate) — proves a
// released hold shows distinctly from both "pending" and "free", and stays
// a valid "Propose another time" candidate (`candidateProposalSlots`'s own
// "cancelled never implies occupied" rule).
const cancelledSlotDate = dateOffset(mondayIso, 3);
insertBooking(db, {
  slotStart: slotIso(cancelledSlotDate, 14),
  slotEnd: slotIso(cancelledSlotDate, 15),
  status: "cancelled",
  calendarEventId: "qa-fixture-booking-hitl-cancelled",
});

console.log(`seeded booking-hitl fixture at ${dbPath}`);
console.log(`  lead.id=${lead.id} telegram_chat_id=${lead.telegram_chat_id}`);
console.log(`  request.id=${request.id} state=awaiting_admin (pending booking id=${pendingBooking.id})`);
console.log(
  `  pending=${pendingSlotDate}T16:00 confirmed=${confirmedSlotDate}T11:00 cancelled=${cancelledSlotDate}T14:00`,
);

db.close();
