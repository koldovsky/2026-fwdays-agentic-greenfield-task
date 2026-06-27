# Product Brief — Kolo360

> Companion to `docs/requirements.md`. That PRD is the numbered,
> traceable source of truth for *what the product does and what constrains it*;
> this brief is the business narrative *behind* it. For *how it looks and reads*,
> see the design brief at `docs/KoloDesign/uploads/kolo360-design-brief.md`.
>
> Tone throughout the product is calm, professional, and confidential — the app
> handles sensitive people-data. UI copy is Ukrainian-first, sentence case, with
> no exclamation marks and no emoji (BC-BRAND-01).

## What this is

Kolo360 is an internal web tool that lets a single **HR manager** run structured
employee assessments — 360° feedback, performance reviews, probation check-ins —
without the usual spreadsheet-and-email sprawl. The manager picks a ready
question template, creates an assessment (a **cycle**) for a specific employee,
and shares one link. The employee answers either by filling a focused web form
or by being **interviewed conversationally by an AI agent** that asks sensible
follow-up questions when an answer is too thin. Every answer lands in one
database; the manager watches progress live and, once the cycle is complete,
asks the AI to draft a concise **summary report** of what was said.

The whole experience is private by design: answers are visible to HR only, the
AI runs server-side inside the app (no third-party bot service sees the raw
data), and nothing about a respondent is shared beyond the manager.

## Who it is for

Two actors, with very different needs:

- **The HR manager** (the power user, daily driver). Signs in to a private
  cabinet, manages a small directory of employees, launches cycles from
  templates, monitors who has responded, and reviews the AI summary. Everything
  the manager touches is dense, calm, and instructional.
- **The respondent** (an employee, often on a phone, once per cycle). Opens a
  link, is told plainly who is being assessed and that answers are confidential,
  then either fills a short form or talks to the AI interviewer. No account, no
  install, no app — just the link.

There are no public or anonymous visitors: every screen is reached either behind
the manager's sign-in or via a private per-cycle link.

## The pain it addresses

Today a small HR team running reviews juggles a questionnaire in one tool,
chases replies over email and chat, copies answers into a spreadsheet by hand,
and then writes up a summary from memory. It is slow, error-prone, and the
people being assessed rarely know what happens to their words.

Kolo360 collapses that into one calm flow. Templates remove the "what do we even
ask" friction. The shared link removes the chasing. The AI interviewer pulls
fuller, more concrete answers out of people who would otherwise write one vague
line. And the AI summary turns a pile of raw answers into a structured draft the
manager can read in minutes — while the raw dialogs stay private to HR.

## End-to-end usage

1. **Sign in.** The HR manager opens the app and signs in to a private cabinet.
   There is no public landing experience; the cabinet is the product
   (FR-AUTH-01, FR-SHELL-01).
2. **Keep a directory.** The manager maintains a small list of employees — name,
   role, email, phone, optional Telegram handle. An employee is registered once
   and reused across cycles (FR-DIR-01/02).
3. **Pick a template.** The app ships with a few ready, read-only assessment
   templates (e.g. a probation check-in, a peer-feedback set). Each is a list of
   questions of two kinds: a **scale** question (pick one labelled option) and an
   **open** question (free text). Templates are not edited in this version
   (FR-TPL-01/02).
4. **Create a cycle.** The manager chooses a template and a subject employee,
   sets a deadline, and launches. This creates a **cycle** with its own private
   link and a `collecting` status (FR-CYCLE-01/02). At launch the template is
   *snapshotted* into the cycle, so later template changes never alter a cycle in
   flight (FR-CYCLE-03).
5. **Share the link.** The manager copies the cycle's private link and sends it
   to the respondent (in this version, by any channel they like — email, chat,
   or Telegram by hand). The link needs no password and resolves to that one
   cycle only (FR-LINK-01/02).
6. **Choose how to answer.** Opening the link, the respondent sees a calm intro —
   who is being assessed, the assessment type, the deadline, and a one-line
   confidentiality note — then chooses: **fill the form myself**, or **answer the
   AI's questions** (FR-RESP-01/02).
7. **Answer by form.** The form shows one section at a time with a thin progress
   indicator. Scale questions render their labelled options; open questions are
   auto-growing text fields. Progress is saved per section, so the link is
   resumable (FR-FORM-01/02/03).
8. **Answer by AI interview.** Instead, the respondent chats with the AI agent.
   It walks the same template questions in order, in plain Ukrainian, and — when
   an answer is too short or vague — asks a brief follow-up or clarifies what the
   question means, then moves on once the answer is sufficient. The agent never
   invents answers and never wanders off the template (FR-AI-01/02/03/04). The
   conversation maps cleanly back to the same per-question answers a form would
   produce (FR-AI-05).
9. **Track progress.** Back in the cabinet, the manager sees each cycle's live
   status — not started, in progress, or done — and can open a cycle to read the
   collected answers per question (FR-PROGRESS-01/02).
10. **Read the AI summary.** Once a cycle is complete, the manager asks the AI to
    draft a **summary report**: strengths, growth areas, and notable quotes,
    grounded strictly in the answers given. The manager reads it, and the raw
    answers and any interview dialog stay private to HR (FR-REPORT-01/02/03).

## Key workflows in prose

- **Run one assessment, end to end.** Sign in, register the employee (or reuse
  them), pick a template, launch a cycle, send the link, watch it fill in, read
  the AI summary. This is the core loop and the whole MVP exists to support it.
- **Let the AI do the interviewing.** For respondents who write one vague line,
  the AI interview is the differentiator: it probes for a concrete example, keeps
  the tone calm, and produces a fuller answer than a blank text box ever would —
  while staying strictly on the template's questions.
- **Summarise without re-reading everything.** Instead of reading every raw
  answer, the manager gets a structured draft and only drills into the raw text
  when something needs checking.

## MVP vs Future boundary

**In the MVP:** HR sign-in and the cabinet shell; a small employee directory;
a few seeded read-only templates (scale + open questions); creating and launching
a cycle for one subject with a deadline and a private link; the respondent's
choice of **form** or **AI interview**; the web form with per-section autosave;
the **AI conversational interview** (adaptive follow-ups, on-template, no
invented content) running **server-side inside the app on the Claude API**;
live progress and per-question results for HR; and an **AI summary report**
grounded in the answers. All people-data stays in one database under the team's
control; Ukrainian-first, calm, confidential.

**Future (deferred):**

- Full 360°: multiple reviewers per subject (peer / manager / report / self),
  reviewer relations, coverage minimums, and calibration flags.
- A **Telegram** delivery channel for the interview (the agent and its prompts
  are built channel-agnostic in MVP so Telegram can be added without a rewrite).
- An HR-facing **template editor** and custom methodologies.
- The editorial **approval gate** for reports (in-place editing, evidence
  pull-quotes, locking and versioning) described in the design brief.
- Reminders, scheduled jobs, and notifications.
- Multiple HR users, roles, and organisations.
- Exports (PDF / CSV) and analytics across cycles.

## Operating principles

- **Confidential by design.** Answers are visible to HR only. Respondent links
  carry no personal data in a guessable way; raw interview dialogs are never
  shown outside the cabinet (BC-PRIVACY-01/02).
- **AI stays in-house.** The agent runs server-side inside the app against the
  Claude API; the model sees only what a given step needs, and no third-party
  bot platform handles the raw people-data (TC-AI-01, BC-PRIVACY-03).
- **Grounded, not inventive.** The interviewer asks only template-derived
  questions and the summariser uses only the collected answers — no invented
  facts, scores, or quotes (FR-AI-04, FR-REPORT-02).
- **Honest under failure.** No external call (Claude API, database) produces a
  generic error page or a silent blank; failures degrade to a calm, visible
  state, and the runtime console stays silent on a healthy session (NFR-OBS-01).
- **Calm and Ukrainian-first.** UI strings are centralised and Ukrainian-first,
  the tone is practical and reassuring, sentence case, no exclamation marks, no
  emoji (NFR-I18N-01, BC-BRAND-01).
- **Testable core.** The logic that can be wrong silently — answer-sufficiency
  rules, progress and scale aggregation, template snapshotting — lives in pure,
  framework-free functions with unit tests, and the AI behaviours are checked
  with evals (TC-PURE-01, NFR-DX-01).
