# Product Brief — Kamerton / Vocal-School Booking Agent

> Companion to `docs/requirements.md`. The requirements document is the numbered,
> traceable source of truth; this brief is the business narrative behind it.
> Tone throughout the product is Ukrainian-first, kind and pressure-free
> (BC-BRAND-01); the agent prepares decisions, a human makes them (FR-GUARD-01).

## What this is

Kamerton (Ukrainian for "tuning fork") is a local-first booking agent for a
one-teacher vocal school. Parents and adult students talk to a Telegram bot; the
bot answers questions strictly from the school's knowledge base, collects what is
needed for a trial voice lesson, and turns the conversation into a structured
booking request. That request streams in real time — over the AG-UI protocol —
onto the teacher's local dashboard, where she confirms, adjusts, or declines it
with one click, and the bot instantly relays her decision back to Telegram. The
whole system runs on one machine: no webhooks, no tunnels, no cloud database.

## Who it is for

Two actors. The **lead** — a parent of a child aged 4+ or an adult who wants to
study voice — interacts only with the Telegram bot, in Ukrainian, at whatever
hour suits them. The **administrator** — the vocal teacher herself, the school's
only teacher — works from a dashboard on `localhost` between her own lessons.

One scoping note that shapes many conversations: the school teaches **voice
only**. A piano is present in the room, but the teacher uses it exclusively to
accompany vocal warm-ups — so the agent must explain that distinction gracefully
whenever someone asks for "piano lessons" (BC-SCOPE-01/02).

## The pain it addresses

Intake today is manual. Parents message at all hours and ask the same questions —
minimum age, individual or group, schedule, price — and agreeing on a trial-lesson
time stretches across many messages, because the teacher cannot reply while she is
teaching. Some leads simply go cold in that gap. The product reduces this to one
calm loop: the bot handles the conversation whenever it happens, and the teacher's
only job is a single confirm/adjust/decline decision when she has a free minute.

## End-to-end usage

1. **Write.** A lead messages the bot. The agent greets them — with a one-line
   notice that messages are processed via the Anthropic API (NFR-PRIV-02) — and
   answers factual questions strictly from `knowledge/school.md` (FR-FAQ-01);
   anything the base cannot answer is flagged for the administrator instead of
   improvised (FR-FAQ-02, BC-PRICE-01), every question, answered or not, is
   logged for the knowledge-base loop (FR-KB-01), and when the teacher later
   answers, the bot brings that answer back to this lead (FR-KB-04).
2. **Qualify.** The agent collects the student's name, age, preferred format, and
   preferred weekday/time range (FR-INTAKE-01), validating age and scope before
   going any further (FR-INTAKE-02): under-4s get a kind "come back at 4"
   (BC-AGE-01, FR-GUARD-04), instrument requests get the warm-ups explanation
   (BC-SCOPE-02), and the undecided get a short individual-vs-group comparison
   (BC-FORMAT-01).
3. **Get to know the singer.** Three light questions, one at a time, borrowed
   from how established vocal studios open a first conversation. *Why:* karaoke
   with friends, the stage, beating shyness, or the lead's own words
   (FR-INTAKE-03). *What:* favourite artists, what's on the playlist, and one
   song they'd love to sing — asked of the parent when the student is little
   (FR-INTAKE-04). *Where from:* prior choir or lessons, and whether a cappella
   or a backing track feels more comfortable — a gentle shyness signal, never a
   test (FR-INTAKE-05). Together these become the **first-lesson brief** on the
   request card, so the trial lesson opens with music the student already loves
   (FR-INTAKE-06, BC-LESSON-01).
4. **Pick a time.** The agent proposes 2–3 free slots that fit the lead — always
   Mon–Fri, always 10:00–20:00. Availability is real: the deterministic grid
   minus busy time in the teacher's DEMO Google Calendar (FR-SLOT-01,
   FR-GUARD-03, BC-SCHEDULE-01, ADR-0003), ranked so the slot suits the lead
   *and* keeps the teacher's day compact (FR-SLOT-04). The chosen slot is
   soft-held as `pending` and appears in the calendar as a tentative event
   (FR-SLOT-02).
5. **Watch it live.** On the dashboard, the teacher sees the conversation stream
   and the request card fill in field by field over AG-UI events (FR-DASH-01).
   The week's schedule renders as a **concert hall**: days are rows, hour slots
   are seats — free, held (amber), confirmed (green) — and clicking a held seat
   opens its request card (FR-DASH-03). A developer panel with the raw event
   feed is Future (FR-DASH-02).
6. **Decide.** The `pending` request — first-lesson brief included — shows
   Confirm / Propose another time / Decline. Nothing reaches the lead until she
   acts (FR-HITL-01, FR-GUARD-01). Next to the queue sits the **Question inbox**:
   a plain newest-first list of unanswered lead questions (FR-KB-02; dedup and
   frequency counters are Future, FR-KB-05); answering one appends it to the
   knowledge base for every future lead (FR-KB-03) and sends the answer back to
   the lead who asked (FR-KB-04) — and only she can do that, never the agent
   (FR-GUARD-06).
7. **Close the loop.** Her decision travels back through the bot: a confirmation
   with the date and time, or a counter-offer, lands in the lead's Telegram
   within a second (FR-HITL-02).

## Key workflows in prose

- **The evening inquiry.** A parent writes at 22:30. The agent answers the age
  question, collects everything, and holds a Tuesday 17:00 slot. The teacher
  confirms it over morning coffee; the parent wakes up to a confirmed lesson.
- **The piano misunderstanding.** "We'd like piano lessons for our son" — the
  agent kindly explains the school teaches voice, with piano only as warm-up
  accompaniment, and offers a trial voice lesson instead. No false promises.
- **The Saturday push.** "Can we do Saturday, please?" — the agent cannot offer
  a weekend even if it wanted to: no such slot exists in the grid the code
  generates, and the calendar can only subtract from it. It offers the nearest
  weekday options instead.
- **The group joiner.** A lead prefers the group format; the agent suggests an
  existing group within ±2 years of the student's age, or the waitlist for a new
  one (FR-GROUP-01).
- **The first lesson that lands.** A shy adult admits they want to stop dreading
  karaoke nights and loves 90s rock. The teacher opens the trial with a song from
  that playlist and a no-audience warm-up — because the brief told her exactly
  that before she confirmed the slot (FR-INTAKE-03/04/05/06, BC-LESSON-01).
- **The growing FAQ.** Three different parents ask whether lessons continue over
  school holidays. Each question lands in the Question inbox (a plain list in
  MVP; the ×3 dedup counter is Future, FR-KB-05); the teacher types the answer
  once — the bot delivers it back to everyone who asked (FR-KB-04), and the
  fourth parent gets it instantly from the knowledge base (FR-KB-01/02/03,
  FR-GUARD-06).
- **The change of plans.** A parent in `awaiting_admin` writes "sorry, Tuesday
  no longer works" — the bot releases the held slot, updates the request
  (FR-INTAKE-07), and offers new times; months later the same parent books a
  trial for a sibling, and a fresh request starts without touching the first
  child's profile (FR-INTAKE-08).

## MVP vs Future boundary

**In the MVP:** the full single-flow loop above — intake with the get-to-know
questions and the first-lesson brief, amendments and cancellation before the
decision (FR-INTAKE-07), returning leads (FR-INTAKE-08), FAQ from the knowledge
base with the question log and the answer delivered back to whoever asked
(FR-KB-04), Google-Calendar-backed slots with convenience ranking and the
widen-the-window fallback (FR-SLOT-01..04, ADR-0003), the `pending` hold with
its tentative calendar event, the live AG-UI dashboard with human-in-the-loop
decisions,
the concert-hall schedule view (FR-DASH-03), the plain-list Question inbox, the
Telegram close-out, honest degradation on API failures (NFR-REL-01), and the
privacy notice (NFR-PRIV-02) — plus the guardrail eval suite (`npm run evals`)
and the unit-tested pure `lib/` (TC-TEST-01/02, TC-PURE-01).

**Future (the `Phase` column in requirements.md is authoritative):** group
matching and the waitlist (FR-GROUP-01), the raw-events developer panel
(FR-DASH-02), inbox deduplication with frequency counters (FR-KB-05), and the
lead-facing **web-booking** channel — the same concert-hall seat map as a
lead-side picker plus the same agent in a CopilotKit chat (FR-WEB-01/02),
publishable (or packaged as a Telegram Mini App) once the school wants it
public — promoted only after the MVP loop is green.

**Future (deferred):** the PRD's explicit out-of-scope list, none of which is
built — payments, reminders, rescheduling of confirmed lessons, calendar
integrations, public deployment, voice-message or audio analysis, and
multi-teacher scheduling.

## Operating principles

- **A human makes every commitment.** The agent has no tool that can confirm a
  booking; the `confirmed` transition exists only behind the administrator's
  click (FR-GUARD-01).
- **Rules live in code, not in hope.** Age limits and the Mon–Fri 10:00–20:00
  window are enforced by deterministic, unit-tested functions; the teacher's
  calendar only *subtracts* availability, and the ranking that balances the
  lead's wishes with a compact teaching day is a pure function too; the model
  only chooses among options the code has already vetted (FR-GUARD-03/04,
  FR-SLOT-04, TC-PURE-01, ADR-0003).
- **Facts come from one file — and the file learns.** Everything the agent
  claims about the school traces to `knowledge/school.md`; unknowns are recorded,
  never invented (FR-FAQ-01/02, BC-PRICE-01). The base grows from real lead
  questions, but only through the administrator's approval in the Question inbox —
  the agent has no way to write to it (FR-KB-01/02/03, FR-GUARD-06).
- **Local and private by construction.** Long polling means no inbound
  connections; the dashboard binds to localhost; the Telegram token stays in an
  untracked `.env` guarded by a gitleaks pre-commit hook, and the Anthropic side
  authenticates via the developer's local user token — no API key on disk
  (NFR-LOCAL-01, NFR-SEC-01, NFR-PRIV-01, TC-SEC-01).
- **Ukrainian-first, kind, pressure-free.** The voice of the product is defined
  in DESIGN.md and holds everywhere — including refusals (BC-BRAND-01).