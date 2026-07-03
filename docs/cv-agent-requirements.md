# PRD — CV-Agent / Honest Resume Tailor

Last updated: 2026-07-03

This document is the **single source of truth** for what the product does and
what constraints govern it. Every requirement has a stable ID. Specs, tests,
PRs, and recordings reference these IDs to keep traceability intact.

Refer to [docs/product-brief.md](product-brief.md) for narrative context.

## ID conventions

| Prefix  | Meaning                    | Example                                          |
| ------- | -------------------------- | ------------------------------------------------ |
| `FR-*`  | Functional Requirement     | `FR-CV-01` — user uploads a CV file             |
| `NFR-*` | Non-Functional Requirement | `NFR-PERF-01` — first token streamed < 3 s       |
| `TC-*`  | Technical Constraint       | `TC-STACK-01` — Next.js App Router               |
| `BC-*`  | Business / UX Constraint   | `BC-HONESTY-01` — grounded output only           |

Status values: `proposed` · `accepted` · `shipped` · `dropped`.

---

## Functional requirements

### Shell & navigation

| ID           | Description                                                                                                   | Status   |
| ------------ | ------------------------------------------------------------------------------------------------------------- | -------- |
| FR-SHELL-01  | Single-page app with a top bar (logo, nav links: Features, Pricing) and a main content area                   | proposed |
| FR-SHELL-02  | Layout adapts at 768 px and 1280 px breakpoints; mobile single-column, desktop two-column result view         | proposed |
| FR-SHELL-03  | Empty / landing state: hero copy + primary CTA prominently centered; no auto-processing on load               | proposed |

### Onboarding & auth (capability `auth`)

| ID              | Description                                                                                                       | Status   |
| --------------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| FR-ONBOARD-01   | Anonymous visitor may complete one full tailoring (CV upload → result) without signing in; paywall appears at export | proposed |
| FR-AUTH-01      | Sign-up and sign-in via email + password                                                                          | proposed |
| FR-AUTH-02      | Sign-in via Google OAuth                                                                                           | proposed |
| FR-AUTH-03      | Password-reset flow via email link                                                                                 | proposed |

### CV management (capability `cv-profile`)

| ID        | Description                                                                                                                      | Status   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-CV-01  | User uploads a CV as PDF or DOCX; app extracts plain text server-side                                                            | proposed |
| FR-CV-02  | User may alternatively paste CV as plain text                                                                                    | proposed |
| FR-CV-03  | Parsed CV is displayed as a structured summary (experience items, skills, education) before tailoring begins; user confirms or re-uploads | proposed |
| FR-CV-04  | Parsed CV is stored as a profile against the user's account (logged-in only); re-used across subsequent tailorings               | proposed |
| FR-CV-05  | User can delete their stored CV profile; all associated tailorings are also deleted                                               | proposed |

### Job description (capability `jd-parse`)

| ID        | Description                                                                                                                 | Status   |
| --------- | --------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-JD-01  | User pastes a job description as free-form text; app extracts a ranked list of requirements                                 | proposed |
| FR-JD-02  | Each extracted requirement is labelled `must-have` or `nice-to-have` and displayed for review before generation begins     | proposed |

### Tailoring (capability `tailor`)

| ID            | Description                                                                                                                             | Status   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-TAILOR-01  | Pressing «Адаптувати» enqueues an async job; user sees a visible progress state (queued → processing → done)                            | proposed |
| FR-TAILOR-02  | Result streams token-by-token once the LLM begins responding; user does not wait for the full payload before reading starts             | proposed |
| FR-TAILOR-03  | If the LLM call fails, the queue retries up to 2 times before surfacing a calm error message; tokens are not charged for failed retries | proposed |
| FR-TAILOR-04  | Each tailoring is stored in history for logged-in paid users; free users see the current session result only                            | proposed |

### Compliance checklist (capability `checklist`)

| ID               | Description                                                                                                                    | Status   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-CHECKLIST-01  | `checklistItem(requirement, cvProfile): { status, rationale }` is a **pure function** in `lib/scoring/checklist.ts`           | proposed |
| FR-CHECKLIST-02  | Status values: `met` (green) · `partial` (yellow) · `gap` (red) · `overclaim-risk` (orange)                                   | proposed |
| FR-CHECKLIST-03  | Rationale is a single sentence in Ukrainian, max 100 chars, no emojis; it states which part of the CV supports or contradicts the requirement | proposed |
| FR-CHECKLIST-04  | Overall match score (0–100, weighted by `must-have` vs `nice-to-have`) is shown as a headline badge above the checklist        | proposed |

### Grounded bullets (capability `bullets`)

| ID             | Description                                                                                                                                      | Status   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-BULLETS-01  | Each rewritten bullet carries a grounding indicator: a link to the source sentence in the CV, or an `overclaim-risk` warning if no evidence found | proposed |
| FR-BULLETS-02  | `overclaim-risk` bullets are **excluded from export by default**; user must actively opt them back in with an acknowledgement click              | proposed |
| FR-BULLETS-03  | Grounding check is a second LLM pass with a separate, stricter system prompt; it does not share context with the generation pass                 | proposed |

### Inline editing (capability `edit`)

| ID          | Description                                                                                                     | Status   |
| ----------- | --------------------------------------------------------------------------------------------------------------- | -------- |
| FR-EDIT-01  | User can edit any generated bullet inline in the result view; edits are local until the user explicitly saves   | proposed |
| FR-EDIT-02  | Editing a bullet removes its grounding indicator and marks it as «відредаговано вручну»                         | proposed |

### Guided tailoring wizard (capability `wizard`)

| ID            | Description                                                                                                                          | Status   |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-WIZARD-01  | After JD + CV are submitted, the system shows the match score and checklist first and pauses; bullet rewriting starts only on the user's explicit confirmation | proposed |
| FR-WIZARD-02  | Before generating bullets, the system asks up to a bounded number of targeted clarifying questions about requirements scored `partial` or `gap`, derived from those requirements' keywords | proposed |
| FR-WIZARD-03  | Each clarifying question can be answered, skipped, or declined; unanswered questions never block proceeding to generation             | proposed |
| FR-WIZARD-04  | A confirmed clarifying-question answer becomes additional grounding evidence for bullet generation, visually tagged as user-confirmed (distinct from CV-sourced evidence) | proposed |
| FR-WIZARD-05  | The flow is presented as a visible linear sequence (Analyze → Confirm → Clarify → Generate → Export) so the user always knows the current step | proposed |

### Export (capability `export`)

| ID            | Description                                                                                                            | Status   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-EXPORT-01  | User can copy the full tailored résumé to clipboard                                                                    | proposed |
| FR-EXPORT-02  | User can download a clean PDF                                                                                          | proposed |
| FR-EXPORT-03  | User can download a DOCX                                                                                               | proposed |
| FR-EXPORT-04  | Free-tier exports include a small footer line «Адаптовано за допомогою CV-Agent»; paid exports are clean              | proposed |

### Landing page & sales surface (capability `sales`)

| ID           | Description                                                                                                                          | Status   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-SALES-01  | Public landing page: hero, before/after demo (static example), positioning copy, pricing table, FAQ, footer CTA                     | proposed |
| FR-SALES-02  | Before/after demo on the landing shows a real requirement → grounded bullet + checklist row, no sign-in required                    | proposed |
| FR-SALES-03  | Pricing table shows Free, Pro (monthly), and Job-hunt Pass (one-time 30-day) with feature comparison                                | proposed |

### Paywall & billing (capability `billing`)

| ID              | Description                                                                                                                          | Status   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-PAYWALL-01   | After the first free tailoring, a paywall intercepts the export step and the start of any subsequent tailoring                       | proposed |
| FR-PAYWALL-02   | Paywall offers two options: Pro subscription and Job-hunt Pass; user chooses before being redirected to the payment flow             | proposed |
| FR-PAYWALL-03   | Successful payment immediately upgrades the session; user is returned to exactly the screen they left                                | proposed |
| FR-BILLING-01   | Billing portal (accessible from account settings): shows current plan, next renewal date, invoice history, cancel button            | proposed |
| FR-BILLING-02   | Cancellation downgrades to Free at end of current period; active tailorings remain readable but export is gated                     | proposed |
| FR-BILLING-03   | Payment failure on checkout returns user to Free status with a clear message and a retry CTA; no partial-access state               | proposed |

### Tailoring history (capability `history`)

| ID            | Description                                                                                              | Status   |
| ------------- | -------------------------------------------------------------------------------------------------------- | -------- |
| FR-HISTORY-01 | Logged-in paid users see a list of past tailorings (date, job title extracted from JD, match score)      | proposed |
| FR-HISTORY-02 | Selecting a past tailoring re-opens the result view in read/edit mode                                    | proposed |

---

## Non-functional requirements

| ID           | Description                                                                                                                 | Status   |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- | -------- |
| NFR-PERF-01  | First token streamed to the client within 3 s of the tailoring job starting (p95)                                          | proposed |
| NFR-PERF-02  | Full tailoring result delivered within 30 s (p95)                                                                           | proposed |
| NFR-PERF-03  | Landing page TTFB ≤ 300 ms on Vercel Preview (p95)                                                                         | proposed |
| NFR-PERF-04  | Lighthouse Performance ≥ 90 on landing page (mobile + desktop)                                                             | proposed |
| NFR-A11Y-01  | Lighthouse Accessibility ≥ 95; all interactive elements have visible focus styles and accessible names                     | proposed |
| NFR-COST-01  | LLM cost per Pro tailoring ≤ 30 % of monthly Pro revenue per user at median usage; enforced via per-request token budget   | proposed |
| NFR-COST-02  | Free-tier tailorings are rate-limited per IP to prevent abuse; limit: 2 lifetime per account, 1 per IP per 24 h anonymous  | proposed |
| NFR-OBS-01   | No LLM error, queue timeout, or parse failure produces a silent blank; all failures surface a calm Ukrainian message       | proposed |
| NFR-OBS-02   | Console is silent at runtime (no warnings, no errors) on a healthy session                                                  | proposed |
| NFR-I18N-01  | Product UI strings centralised in `lib/i18n/uk.ts`; English fallback in `en.ts`; no runtime i18n library in MVP           | proposed |
| NFR-SEC-01   | CV text stored encrypted at rest (AES-256 or provider-native); never logged in plaintext                                   | proposed |
| NFR-SEC-02   | CV data is never sent to the LLM provider with identifying metadata; user ID is not included in LLM request payloads       | proposed |
| NFR-SEC-03   | Public endpoints (auth, tailor) set standard security headers on every response (CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`) | proposed |
| NFR-SEC-04   | Public unauthenticated endpoints (register, tailor) are rate-limited per IP and carry a lightweight bot-resistance check (honeypot field); requests failing either are rejected calmly and never processed | proposed |
| NFR-GDPR-01  | Users can export all their stored data (CV profile + tailoring history) as JSON on request                                 | proposed |
| NFR-GDPR-02  | Users can permanently delete their account and all associated data; deletion propagates within 24 h                        | proposed |

---

## Technical constraints

| ID           | Description                                                                                                                              | Status   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| TC-STACK-01  | Next.js App Router; TypeScript strict; React                                                                                             | accepted |
| TC-STACK-02  | Tailwind CSS; shadcn/ui components                                                                                                       | accepted |
| TC-STACK-03  | Anthropic API (Claude) for generation and grounding passes; Vercel AI SDK v5 for streaming and structured output                         | accepted |
| TC-STACK-04  | BullMQ + Redis for the async tailoring queue; workers run as long-lived Node processes or Vercel background functions                    | accepted |
| TC-STACK-05  | PostgreSQL for users, CV profiles, job descriptions, tailorings, subscriptions, usage counters                                           | accepted |
| TC-STACK-06  | Merchant of record (Paddle or Lemon Squeezy) for payments; subscription state synced via webhooks into `subscriptions` table             | proposed |
| TC-STACK-07  | Auth via Auth.js, Supabase Auth, or Clerk — decision deferred; must support email + Google OAuth without custom session management       | proposed |
| TC-PARSE-01  | PDF text extraction server-side only; client never receives raw binary; library TBD (pdf-parse, pdfjs-dist, or Cloudflare Worker)        | proposed |
| TC-PARSE-02  | DOCX text extraction server-side only; library TBD (mammoth.js)                                                                         | proposed |
| TC-PURE-01   | `lib/` is framework-free: no `next/*`, no DOM globals — enables 100 % unit-testability                                                  | proposed |
| TC-DEPLOY-01 | Vercel for hosting; preview URL per PR via Git integration                                                                               | proposed |

---

## Business / UX constraints

| ID              | Description                                                                                                                              | Status   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BC-HONESTY-01   | The generation system prompt explicitly forbids introducing skills, numbers, or experience not present in the candidate's CV text        | accepted |
| BC-HONESTY-02   | Overclaim-risk bullets are excluded from export by default and cannot be silently re-included; user must acknowledge the risk explicitly  | accepted |
| BC-PRIVACY-01   | No analytics scripts, no third-party trackers, no fingerprinting on any page                                                             | accepted |
| BC-PRIVACY-02   | CV text is PII; it is encrypted at rest, never used for model training, and deletable on request (see NFR-SEC-01, NFR-GDPR-02)           | accepted |
| BC-HONESTY-03   | User-confirmed answers to wizard clarifying questions (`FR-WIZARD-02/03/04`) are self-attested evidence, distinct from CV-sourced evidence; both are legitimate grounding sources for generation, but the UI always discloses which is which — this does not loosen `BC-HONESTY-01`, it defines a second honest evidence source | proposed |
| BC-BRAND-01     | UI is Ukrainian-first; tone is calm, direct, and practical — the product never overstates the candidate's experience                     | proposed |
| BC-BRAND-02     | Footer credits Anthropic API usage with a hyperlink; does not imply endorsement                                                          | proposed |
| BC-DEMO-01      | The repo and live URL are the primary publicly demonstrable artifacts; every FR must be exercisable on the live URL                      | accepted |

---

## Out of scope (MVP)

- Coach / multi-candidate mode (one account, many CVs)
- ATS keyword gap diagnostic as a standalone view
- Cover letter generation
- Browser extension for one-click JD capture
- LinkedIn profile tailoring
- Recruiter-facing view or API
- Localisation beyond Ukrainian + English UI labels
- Native mobile app
- Background refresh or scheduled re-tailoring
- Climate / historical career analysis
