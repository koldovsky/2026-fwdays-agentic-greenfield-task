# Product Brief — CV-Agent / Honest Resume Tailor

> Companion to `docs/requirements.md`. The requirements document is the numbered,
> traceable source of truth; this brief is the business narrative behind it.
> Tone throughout the product is Ukrainian-first, direct, and honest — the product
> never oversells the candidate and never oversells itself (BC-BRAND-01).

## What this is

CV-Agent is a web application that adapts a candidate's résumé to a specific job
description in under two minutes — and does so **without fabricating experience**.
For each job requirement, the agent produces a grounded compliance checklist:
every requirement is labelled `met`, `partial`, `gap`, or `overclaim-risk`, with
a short rationale drawn only from the candidate's own CV text. Bullets rewritten
by the agent carry a source reference or a visible warning that no supporting
evidence was found.

The product competes on honesty, not speed. ChatGPT and commodity ATS-optimisers
also rewrite résumés quickly; CV-Agent is the only tool that actively flags when
a proposed formulation cannot be backed by the candidate's real history.

## Who it is for

The single primary actor is an **active job-seeker** — typically an IT mid-level
or senior engineer applying to 10–50 positions — who values defensibility over
impressive-sounding copy. They have been burned before by résumés they could not
justify in an interview, or they are simply honest people who do not want to
start an employment relationship with a lie.

A secondary actor is a **career coach or HR consultant** who manages several
candidates; this use-case is deferred to a later iteration.

There are no admin roles and no recruiter-facing views in MVP.

## The pain it addresses

Tailoring a résumé to each posting takes 30–60 minutes of careful manual work.
Every AI shortcut available today either hallucinates skills the candidate does
not have, stuffs keywords without regard for truth, or produces generic
reformulations that apply to anyone. The candidate then walks into an interview
carrying claims they cannot defend.

CV-Agent reduces the tailoring work to minutes while keeping the candidate fully
in control of what is true: they see exactly which generated line is grounded in
their own text, which is a stretch, and which is an outright fabrication the
agent caught before they could submit it.

## End-to-end usage

1. **Land.** The visitor sees a minimal hero with clear positioning copy and a
   single primary call to action (FR-SHELL-03). No default state, no
   auto-processing. One free tailoring is available without sign-in so the value
   is felt before any commitment is asked (FR-ONBOARD-01).
2. **Load a CV.** The candidate uploads a PDF or DOCX file, or pastes plain text.
   The app parses it into a structured profile — work experience items, skills,
   education — and displays a compact summary so they can verify the parse was
   correct before continuing (FR-CV-01/02/03).
3. **Paste a job description.** The candidate pastes the full posting text. The
   agent extracts a ranked list of requirements, labelled as `must-have` or
   `nice-to-have`, and displays them for review before generation begins
   (FR-JD-01/02).
4. **Tailor.** The candidate presses «Адаптувати». The request enters an async
   queue; a visible progress state tracks it. Within 30 seconds the result streams
   in (FR-TAILOR-01/02/03).
5. **Read the checklist.** Each extracted requirement maps to a status badge —
   green `met`, yellow `partial`, red `gap`, orange `overclaim-risk` — and a
   one-sentence Ukrainian rationale explaining the verdict (FR-CHECKLIST-01/02/03).
   The overall match score (0–100) is shown as a headline number (FR-CHECKLIST-04).
6. **Read the rewritten bullets.** Each proposed bullet carries a grounding
   indicator: a green link to the source sentence in the original CV, or an
   orange warning that no supporting evidence was found. Overclaim-risk bullets
   are excluded from the export by default; the candidate must actively opt them
   back in (FR-BULLETS-01/02/03).
7. **Edit inline.** The candidate edits any bullet directly in the result view.
   Changes are local; nothing is auto-saved to a server unless the candidate
   explicitly saves the tailoring (FR-EDIT-01).
8. **Export.** The candidate copies the result to clipboard, downloads a clean
   PDF, or downloads a DOCX. Free tier exports carry a small footer attribution;
   paid tier exports are clean (FR-EXPORT-01/02).
9. **Pay to unlock.** After the free tailoring, a paywall appears at the point of
   value — the export step for the first tailoring and the entry to any subsequent
   one. Two options are offered: a monthly Pro subscription and a one-time 30-day
   job-hunt pass (FR-PAYWALL-01/02/03).

## Key workflows in prose

- **Tailor once, decide.** The primary loop: upload CV, paste a JD, press tailor,
  read the checklist, clean up the overclaim warnings, export. This is the core
  and the entire MVP supports it.
- **Spot the overclaim before it costs you.** Every bullet flagged
  `overclaim-risk` is visually distinct and excluded from the default export.
  The candidate reads it, decides whether they can defend it in a conversation,
  and either edits it into something honest or removes it. This is the key
  differentiator.
- **Resume a previous tailoring.** Logged-in paid users can return to a saved
  tailoring, re-edit it, and re-export. The CV profile and all past JDs are
  stored against their account.
- **Upgrade in-flow.** The paywall appears when the candidate is already holding
  a result they want to export or is about to start a second tailoring. The
  upgrade is one click and returns them to exactly where they were.

## MVP vs Future boundary

**In the MVP:** the landing page and sales surface, sign-up / sign-in (email +
Google OAuth), CV upload and parsing (PDF, DOCX, plain text), JD paste and
requirement extraction, async tailoring queue with streaming result, the
compliance checklist with colour-coded badges, grounded bullets with
overclaim-risk flags, inline editing, copy / PDF / DOCX export, freemium limits
(2 free lifetime tailorings), Pro subscription and job-hunt pass via a
merchant-of-record, billing portal (cancel, invoices), and tailoring history for
paid users.

**Future (deferred):**

- Coach / multi-candidate mode (one account managing several CVs).
- ATS keyword gap diagnostic as a standalone view.
- Cover letter generation.
- Browser extension for one-click JD capture.
- LinkedIn profile tailoring.
- Recruiter-facing view or API.
- Localisation beyond Ukrainian + English UI labels.
- Native mobile app.

## Operating principles

- **Grounded output only.** The LLM prompt explicitly forbids introducing skills,
  numbers, or experience items not present in the candidate's CV text. The
  grounding check is a second model pass, not a trust-the-first-pass assumption
  (BC-HONESTY-01).
- **Overclaim is the enemy.** Any output the system cannot ground is flagged
  before it reaches the candidate's clipboard, and excluded from export by
  default. The feature is non-negotiable and cannot be disabled by the user
  (BC-HONESTY-02).
- **Honest under failure.** No LLM error, queue timeout, or parse failure
  produces a silent blank or a hallucinated result. Failures degrade to a calm,
  visible message; the queue retries up to twice; tokens are not charged for
  failed attempts (NFR-OBS-01).
- **Privacy-first.** CV text is PII. It is encrypted at rest, never used for
  model training, and deletable on request. No third-party trackers are loaded
  on any page (BC-PRIVACY-01).
- **Ukrainian-first, calm.** UI strings are centralised and Ukrainian-first.
  Tone is direct and practical — the product never hypes the candidate's
  experience and never hypes itself (BC-BRAND-01).
