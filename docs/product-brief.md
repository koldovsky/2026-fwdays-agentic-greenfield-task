# Product Brief — TinyStart

> Companion to `docs/requirements.md`. The requirements document is the numbered,
> traceable source of truth; this brief is the business narrative behind it.
> Tone throughout the product is warm, direct, and non-patronizing — no guilt,
> no hustle culture, no exclamation marks (BC-BRAND-01).

## What this is

TinyStart is a calm, privacy-first web app that helps people with ADHD (and
similar executive-function challenges) **start work**, **stay focused**, and
**feel motivated** without guilt, overwhelm, or rigid productivity culture.

It reduces activation energy with tiny time commitments, externalizes working
memory through task breakdown, and protects focus with a single-task-at-a-time
UI. There are no accounts, no cloud sync, and no analytics in the MVP — all data
stays on the user's device via local storage.

## Who it is for

The primary actor is **Alex, a knowledge worker with ADHD** — someone who has
a backlog of tasks but gets stuck at "open laptop → stare → scroll." They tried
Todoist, Notion, or Pomodoro and abandoned them because they felt rigid or
guilt-inducing. They want something that helps **today**, not another system to
maintain.

A secondary actor is **Sam, a student** with an irregular schedule who needs help
breaking assignments into steps and doing "just 5 more minutes."

There are no roles, no sign-in, and no stored profile. Anyone who opens the app
in their browser is a full user. Clinical treatment, team collaboration, and
enterprise project management are explicitly out of scope for v1 (BC-SCOPE-01).

## The pain it addresses

People with ADHD often know what to do but cannot start ("waiting mode"), lose
steps in working memory, underestimate time, and feel shame after missed goals —
which makes starting even harder.

Most productivity tools assume consistent motivation, linear planning, and
punishment for failure. TinyStart does the opposite: low friction, forgiving
design, and ADHD-informed patterns. The wedge is **start-first, single-task
focus, motivation bridge, shame-free** — in one minimal web app.

## End-to-end usage

1. **Land on Today Home.** The user sees a time-aware greeting, a hero card with
   the recommended next task, and a quick-add input (FR-HOME-01/02/03). If no
   tasks exist, an empty state prompts the first capture (FR-HOME-04).
2. **Capture a task.** The user adds a task in one line; optionally tags energy
   level (low / medium / high) (FR-CAPTURE-01/02). They can attach a personal
   motivation note — "Why does this matter to me?" (FR-MOTIVATION-01).
3. **Break it down.** On task detail, the user edits title and an optional
   motivation note ("Why does this matter to me?"), splits the task into 3–7
   ordered sub-steps, reorders, and deletes as needed (FR-TASK-01/02/03,
   FR-MOTIVATION-01). Edits autosave after a 1200ms pause or on blur for text
   fields (FR-TASK-04). Cancel reverts to the page-open snapshot and returns
   Home (FR-TASK-07).
4. **Start tiny.** From Home or task detail, the user taps "Start focus" and
   picks a preset: 2, 5, 15, or 25 minutes (FR-FOCUS-01/02). If resistance is
   high, "Too hard? Shrink it" suggests the first sub-step only with a 2-minute
   mode (FR-FOCUS-03).
5. **Focus.** A full-screen view shows only the current step, a large calm timer,
   and pause / extend / end controls — no side nav, no task list, no notification
   badges (FR-FOCUS-04/05/06). The timer never flashes red aggressively
   (BC-UX-01). Step progress shows "Step X of Y" (FR-FOCUS-07).
6. **Complete.** When the timer ends, a soft celebration appears with session
   duration and CTAs: keep going, take a break, or done for now (FR-COMPLETE-01).
   Completing all steps offers to mark the task done (FR-COMPLETE-02).
7. **See gentle progress.** A micro recap strip on Home shows minutes focused
   today (FR-RECAP-01). Optionally, a daily recap page summarizes tasks touched,
   minutes focused, and micro-wins — without red metrics or guilt language
   (FR-RECAP-02/03).

## Key workflows in prose

- **First visit → first focus session.** Land, add a task, optionally add why it
  matters, break into steps, start a 5-minute focus block, complete it, and decide
  what's next. This is the core loop the MVP must support end-to-end.
- **Returning user, low motivation.** Open app, see the best next task (oldest
  untouched or last active), feel resistance, shrink to first sub-step + 2 minutes,
  complete a tiny win, get a momentum prompt to continue.
- **Snooze without shame.** User taps "Not today" on the hero task; it is snoozed
  until tomorrow without deletion or overdue styling (FR-HOME-05, BC-UX-02).
- **End of day.** After several sessions, the user opens recap and sees forgiving
  language: tasks touched, minutes focused, optional tags for what helped.

## MVP vs Future boundary

**In the MVP:** Today Home with recommended next task, quick capture with
optional energy tag, task detail with manual breakdown (3–7 steps), motivation
bridge, focus session with timer presets and step-by-step display, completion
moment, local persistence across refresh, and daily recap (P1).

**Future (deferred):**

- Energy check-in that suggests task size and duration
- Body double timer and virtual coworking copy
- Forgiving streaks ("You showed up 4 of last 7 days")
- Task templates with pre-filled breakdown hints
- Focus sounds (lo-fi / white noise)
- JSON export / backup
- User accounts and cross-device sync
- AI-assisted task breakdown
- Calendar integration, real-time body-doubling rooms
- Native mobile apps and third-party integrations (Notion, Google Tasks)

## Operating principles

- **Low activation energy.** A user can start a focus session in ≤2 clicks from
  landing (BC-UX-03).
- **One thing at a time.** Default view shows a single active task; hide the rest
  during focus (BC-UX-04).
- **Flexible, not punitive.** Pausing, extending, or abandoning a session has no
  shame UI (BC-UX-02).
- **Privacy-first.** No analytics requiring PII; all data stays on device
  (BC-PRIVACY-01, NFR-PRIV-01).
- **Calm by default.** Minimal chrome, soft motion, no red overdue alarms
  (BC-BRAND-01, BC-UX-01).
- **Accessible.** WCAG 2.1 AA contrast, keyboard navigation, screen reader labels
  for timer and progress (NFR-A11Y-01).
