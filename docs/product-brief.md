# Cadence — product brief

>  **Date:** 2026-07-09 
> "Cadence" is a working name (one-line swap if changed).
> Companion to `[docs/requirements.md](requirements.md)`. The requirements document is the numbered,
> traceable source of truth; this brief is the business narrative behind it — inline IDs point each
> claim to the requirement that makes it testable.
> This is the north star every agent session reads before touching code. Agents may propose edits,
> never apply them unilaterally.

## What it is

Cadence is a personal deliberate-practice time tracker: one button to start, one to stop, every
session tied to a user-defined category (FR-TIMER-01). On top of the raw sessions sits a
**Whoop-style metrics engine** — instead of just showing hours, it computes scores (consistency,
focus, switching, streaks) against the user's *own rolling baseline* (FR-METR-01..07) — and an
**AI coach** that reads those computed metrics, remembers the conversation, and gives short grounded
advice on how to work more effectively (FR-COACH-01..07).

Delivered as a **React + Tailwind** web app (TC-STACK-03) plus a companion **browser extension**
bound to the same account, so the timer is one shortcut away without keeping a tab open
(FR-EXT-01..03).

**Core design tension (the whole product in one line):** dead-simple to *operate* (start / stop /
pause, a few clicks — NFR-UX-01), seriously *deep* in analytics and coaching. Every scope decision
serves that tension — simplicity at the surface, depth underneath.

## Problem / why

Self-directed people who run several efforts in parallel (a main product, side projects, client
work, a course, a language) have no external system forcing them to track time — no manager
assigning hours, no client timesheet, no fixed schedule. So structure has to come from the person,
and that's exactly what breaks: hours leak across projects invisibly, work happens in guilt-driven
bursts instead of a steady rhythm, and days fragment into shallow context-switching. Generic
trackers answer "how many hours" but not "how well," and give zero guidance on what to change.
Whoop solved this for physiology by turning raw signals into scores, baselines, and coaching;
nothing comparable exists for personal work time in a tool this simple.

## Who it's for

**The core user** is a self-directed knowledge worker running *multiple parallel efforts with no
external structure forcing them to track* — and who cares about improving, not just recording.
Cadence makes their invisible time visible, then coaches it toward consistency and focus.

**Primary persona — the multi-project builder.** Runs several things at once: a main product, side
projects, client work, a course, a language. Wants three things: (1) where did my hours actually go
across these; (2) am I working *regularly* or bingeing; (3) how do I get more effective, not just
log more. Intrinsically motivated, comfortable with data, likely already wears a Whoop/Oura. The
recurring frustration this person feels: *"I worked a lot this week but I don't know if it was
productive."*

**Adjacent segments that share the same job:**

- **Indie hackers / solo founders** — building + marketing + sales + learning, zero external
accountability, need a mirror.
- **Freelancers / consultants with several clients** — constant context-switching; want per-project
hour insight for self-management (not billing).
- **Students & self-learners on parallel tracks** — courses, languages, side projects; want
consistency and visible progress-in-hours. Deliberate practice is the ethos.
- **Researchers / PhDs / creatives** — long unstructured days across writing, reading, experiments;
want to see focus vs fragmentation.
- **Employed people with serious side projects** — a few hours a day that must count; consistency
tracking is the lever.

**Jobs to be done (what they hire Cadence for):**

1. **Allocation** — "show me where my time goes across my projects." (FR-STATS-03, FR-STATS-04)
2. **Regularity** — "tell me if I'm consistent or working in bursts." (FR-METR-02)
3. **Focus** — "tell me if my days are deep blocks or fragmented switching." (FR-METR-03, FR-METR-04)
4. **Progress** — "show me hours accumulating; keep my streak alive." (FR-METR-05, FR-HEAT-01)
5. **Improvement** — "advise me how to work better." (FR-COACH-01, FR-COACH-03)

**Why not an existing tool:**

- **Toggl / Clockify** — tracking + reports, billing-oriented; no baseline-relative scoring, no
coaching.
- **RescueTime** — automatic/passive tracking. Cadence deliberately rejects this: tracking is
**manual because the act of pressing start *is* the deliberate-practice signal** (TC-SCOPE-01).
Passive tools tell you what happened; Cadence makes you decide what you're doing.
- **Whoop / Oura** — the model, but for the body. Cadence ports their pattern — score against your
own baseline, zone it, coach it — to work time, where nothing comparable exists.

The differentiator in one line: **a time tracker with the analytics depth and coaching of a recovery
wearable, kept dead-simple to operate.**

**Not for (anti-users):** teams needing shared timesheets; people who want passive/automatic
tracking; anyone needing invoicing/billing; those wanting a full task/project manager
(TC-SCOPE-01). Single-user, intentional, insight-first — by design (FR-AUTH-07).

## Ideal use moment

You hit the extension shortcut (FR-EXT-02), pick a category, press **Start**, and work. Step away
for coffee — **Pause**, then **Continue** (FR-TIMER-02). Switch to a different project — **Stop**,
then start a new session on another category (FR-TIMER-06). Operation never needs more than start /
stop / pause (NFR-UX-01). At the end of the week you open Stats: the GitHub-style heatmap shows 6
active days (FR-HEAT-01); Consistency sits at 82 (green, +7 vs your 30-day baseline — FR-METR-02,
FR-METR-06); Focus shows 3 deep-work blocks (FR-METR-03); Switching flags Tuesday as fragmented
(FR-METR-04). You open the coach (FR-SHELL-02) and ask "why was Tuesday bad, and how do I raise my
consistency?" It answers grounded in your numbers — "you started before 10:00 on 5 of 6 days;
protect that; Tuesday you switched 11 times with zero deep blocks — batch it" (FR-COACH-03). Every
claim traces to a number visible on the same screen (FR-COACH-02).

## Product shape

Frontend: **React + Tailwind**, single-page app with three routes plus a floating coach
(FR-SHELL-01, FR-SHELL-02). Styling follows a project-owned design-token set (see "Prior art &
design discipline"); component libraries are allowed, but **all iconography is proper SVG — emoji
are forbidden anywhere in the UI** (NFR-DES-01).

### Three pages + coach

1. **Timer (home).** Big timer, category dropdown, Start / Pause / Continue / Stop+Save / Discard
  (FR-TIMER-01..04; Discard asks for confirmation; keyboard: Space, S, Esc — FR-TIMER-05). Below it the GitHub-style activity
   heatmap with period switch (week / month / quarter / 6 months / year) (FR-HEAT-01, FR-HEAT-02).
   Save opens a modal: notes + final category (FR-TIMER-03).
2. **Stats.** The analytics surface: summary tiles (today / week / month / all-time, streak —
  FR-STATS-01), metric score cards with zone colors and baseline deltas (FR-STATS-05), charts
   (bar by day, donut by category, per-category line — FR-STATS-02..04), and the session log with
   manual add, edit, delete (FR-SESS-03..06). Manual entries can include pause segments; and a
   discard, edit, or delete each raises a 5-second bottom-left Undo notification before committing
   (FR-NOTIF-01).
3. **Categories.** CRUD for categories: name, color, description (FR-CAT-01..03).

**AI coach button** floats bottom-right on all pages (Whoop-style): opens a drawer with the latest
insight card plus a **chat** input (FR-SHELL-02). The chat has memory (see AI coach below) — it is
a conversation, not a one-shot lookup (FR-COACH-03, FR-COACH-04).

### Browser extension (MV3)

Popup bound to the same account (session cookie / token): shows timer state, category picker,
Start / Pause / Stop, where Stop opens the **same save modal as the web app** — the extension
mirrors web behavior exactly (FR-EXT-03). A **browser-level keyboard shortcut** opens the popup with
the timer ready (works when the browser is focused; a true OS-global shortcut would require a native
app and is out of scope) (FR-EXT-02, TC-EXT-01). The extension is a thin client over the same API —
no logic of its own; the single active session is server-authoritative and shown **live on both web
and extension at once**, so they never disagree (FR-EXT-01, FR-TIMER-06, NFR-DATA-01).

### Auth

Email + password registration/login (FR-AUTH-01..03), plus OAuth sign-in with Google and with
GitHub (FR-AUTH-04, FR-AUTH-05). Standard session-cookie model (NFR-SEC-02, TC-AUTH-02). Single
role, no admin.

## Metrics engine — the Whoop translation

Deterministic pure functions over the session list; each metric is separately unit-testable
(NFR-DET-01). Core Whoop ideas adopted: **score against your own rolling baseline, not absolutes**;
**zone coloring (green / yellow / red)**; **a small set of named scores instead of raw-data dumps**
(FR-METR-06). Pauses are stored as segments, so interruptions are real data — the engine sees
genuine fragmentation, not just gaps between sessions (FR-SESS-01).


| #   | Metric                        | Definition sketch                                                                                                                                                                                                                  | Whoop analog                                | Requirement |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------- |
| M1  | **Volume**                    | total time today / week / month; daily average (30d)                                                                                                                                                                               | Strain (load)                               | FR-METR-01  |
| M2  | **Consistency Score (0–100)** | blend of (a) day-to-day regularity — coefficient of variation of daily totals over the rolling window — and (b) start-time stability — share of active days whose first session starts within ±60 min of the personal median start | Sleep Consistency (stable bed/wake ±30 min) | FR-METR-02  |
| M3  | **Focus / Deep Work**         | count + total of **uninterrupted sessions ≥ 60 min with zero pauses**; deep-work share of total time                                                                                                                               | Restorative sleep stages share              | FR-METR-03  |
| M4  | **Context Switching**         | category-to-category jumps per active day, plus pause-based interruptions; flag days above personal baseline                                                                                                                       | Disturbances / wake events                  | FR-METR-04  |
| M5  | **Streaks**                   | current and longest run of consecutive active days                                                                                                                                                                                 | Habit streaks                               | FR-METR-05  |
| M6  | **Baseline deltas**           | every score reported as value + Δ vs the user's own trailing 30-day baseline, zoned green / yellow / red                                                                                                                           | Recovery vs personal baseline               | FR-METR-06  |


Exact formulas, window lengths, and zone thresholds are design decisions recorded in DESIGN.md
(open items O-1..O-3) — the brief fixes only the *set* of metrics and the baseline-relative
philosophy.

## AI coach — thin layer, conversational, strict contract

- **Input is (computed metrics snapshot) + (stored conversation history)**, never raw sessions. The
LLM interprets numbers; it never calculates them (FR-COACH-04). This keeps the layer thin, cheap,
and eval-able.
- **Conversation memory:** the coach stores per-user conversation history. Each request assembles
the current metrics snapshot plus prior turns (Whoop-Coach style: metrics accumulate with history
so it feels like an ongoing coach, not a stateless query) (FR-COACH-04). How much history to
include and how to structure/trim it is a **DESIGN.md decision — left to the model/implementation**
(open item O-5; it interacts with free-tier token and rate limits, NFR-COST-01).
- **Modes:**
  - **Insight card (proactive):** generated on demand / on the stats view for the current week —
  2–4 short observations + 1–2 concrete recommendations, every claim citing a number in the
  snapshot. If nothing warrants advice, it says so briefly (Whoop's "stays quiet" principle)
  (FR-COACH-01).
  - **Chat (reactive, with memory):** the user asks things ("why was Tuesday bad?", "how do I raise
  consistency?"). Answered against the snapshot + history (FR-COACH-03).
- **Structured output** (fixed JSON shapes rendered as cards) — not free-form prose dumped into the
page (FR-COACH-05). No emoji in output (NFR-DES-01).
- **Grounding rule (hard requirement):** no number may appear in the coach output that is absent
from the input snapshot. This is the core eval criterion (FR-COACH-02, edge case E-9).
- **Language:** the app UI is English-only; the **coach may respond in the user's chosen language
(English or Ukrainian)** (FR-COACH-06).
- **Provider:** Gemma 4 31B (`gemma-4-31b-it`) via Google AI Studio free tier, single API key
(owner-supplied); structured JSON output. Fallback: Gemini 3 Flash if reliability requires it
(TC-LLM-01, NFR-COST-01). Free-tier is rate-limited and free-tier data may be used by Google for
training (acceptable here).



## Prior art & design discipline

The three-page layout (timer + activity heatmap / metrics / categories) is borrowed as a **visual
reference** from an earlier personal tracker of the owner's, and its CSS/styling may be reused as a
starting point. **No application logic, data model, or code is carried over — this is a clean
greenfield build.**

The frontend is built against a **project-owned design-token set** (a small frontend skill: palette,
type scale, spacing/radius scale, motion, plus 2–3 reference aesthetics and hard do/don't rules),
loaded as static context by every frontend agent session, and given to Claude Code. Rationale: a bare
"don't use your defaults" instruction only produces a *different* default; a positive token contract
makes the UI an intentional, consistent system and removes the generic AI-dashboard look. Hard rules
the skill encodes: **iconography is proper SVG, emoji are forbidden** (NFR-DES-01); typography and
accent color are changed from the prototype (the strongest default "tells" — the prototype's Geist +
lime are exactly the generic signals to drop). Component libraries are permitted, but restyled
through the tokens (TC-STACK-03).

## Stack

- **Backend:** Python (FastAPI), **PostgreSQL**, session-cookie auth (TC-STACK-01, TC-AUTH-02).
Owner's home stack.
- **Frontend:** React + Tailwind, under the design-token skill; component libraries allowed
(TC-STACK-03).
- **AI coach:** Gemma 4 31B via Google AI Studio (free tier), structured output; fallback Gemini 3
Flash. No agent framework (TC-LLM-01).
- **Integrations:** Google OAuth, GitHub OAuth (TC-AUTH-01).
- **Extension:** MV3, thin client over the same API (TC-EXT-01).



## Non-goals (v1 will NOT do)

All captured as TC-SCOPE-01; restated here as narrative.

- No teams, sharing, or social features; single-user data isolation only.
- No idle detection, automatic tracking, or window/app spying — tracking is manual by design.
- No mobile apps; no offline mode.
- No agentic AI, tool-use, or multi-agent framework — the coach is one structured call over
(snapshot + history). Chat memory is stored context, not an autonomous agent.
- No billing, quotas, or admin panel.
- No data import/export UI in v1 (DB is the source of truth).
- Extension: popup only — no content scripts, no per-site tracking.



## Success criteria

- A session can be started, paused, stopped/saved, and later edited — from both web and extension —
and appears **live** in the heatmap and stats across the user's open clients (FR-TIMER-01..03,
FR-SESS-04, FR-EXT-01, NFR-DATA-01).
- All six metrics compute correctly on seeded fixture data, including edge cases (empty history,
single session, midnight-spanning session, timezone boundaries, and pause segments) — proven by
unit tests (FR-METR-01..07, edge cases E-1..E-7).
- The coach insight for a seeded fixture week contains zero fabricated numbers and at least one
actionable recommendation — proven by the eval suite (graded rubric, ratchet floor) (FR-COACH-01,
FR-COACH-02, E-9).
- Auth works with all three methods against a fresh database (FR-AUTH-01..05).
- The full engineering trail is visible in the repo: brief, requirements with stable IDs, specs,
tests, evals, review findings, demo video, and the frontend design-token skill (BC-TRAIL-01).



## Domain vocabulary

- **Session** — one saved work interval: start, end, category, optional notes, and **pause segments**
(v1 stores pauses, so net vs gross duration are both known) (FR-SESS-01, FR-SESS-02).
- **Pause** — a paused interval within a session; any pause disqualifies a stretch from being a deep
block, and pauses count as interruptions in the switching metric (FR-METR-03, FR-METR-04).
- **Category** — user-defined grouping (project or activity), with color; flat list, no nesting
(FR-CAT-01).
- **Active day** — a calendar day (user's timezone) with ≥ 1 session (FR-METR-07).
- **Deep block** — a single continuous session of ≥ 60 min with **zero pauses** (FR-METR-03).
- **Baseline** — the user's own trailing 30-day value for a metric; deltas and zones computed
against it (FR-METR-06).
- **Snapshot** — the JSON bundle of computed metrics for a window; the only metric data the coach
sees (FR-COACH-04).
- **Conversation** — stored per-user coach history; assembled with the snapshot on each request
(FR-COACH-04).
- **Coach** — the LLM layer: insight cards and chat with memory (FR-COACH-01..07).

