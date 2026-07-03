# Vouch — System Design Overview

> Architecture overview for **Vouch**, the Honest Resume Tailor. Grounds the
> engineering shape of the product in the PRD (`docs/cv-agent-requirements.md`)
> and brief (`docs/cv-agent-product-brief.md`). Requirement IDs (`FR-*`, `NFR-*`,
> `TC-*`, `BC-*`) are cited so this doc stays traceable to the source of truth.
>
> Status: **target architecture** for the greenfield build. The repo today ships
> only the Next.js shell + design system (see [Current vs target](#current-vs-target)).

---

## 1. What the system does

Vouch adapts a candidate's résumé to one job description without fabricating
experience. Core loop: **upload CV → paste JD → tailor → read grounded checklist
+ bullets → edit → export**. The differentiator is honesty — every rewritten
bullet is either grounded in the candidate's own text or flagged
`overclaim-risk` and excluded from export by default (`BC-HONESTY-01/02`).

## 2. System context

```
                 ┌───────────────────────────────────────────┐
   Job-seeker ──▶│                 Vouch                       │
   (browser)     │   Next.js App (Vercel)  +  Queue worker     │
                 └───────┬───────────────┬───────────┬─────────┘
                         │               │           │
             ┌───────────▼──┐   ┌────────▼───┐  ┌─────▼────────────┐
             │ Anthropic API│   │ Postgres   │  │ Redis (BullMQ)   │
             │ Claude       │   │ (data)     │  │ (tailoring queue)│
             │ gen+grounding│   └────────────┘  └──────────────────┘
             └──────────────┘
             ┌──────────────┐   ┌────────────┐  ┌──────────────────┐
             │ OAuth / Auth │   │ Merchant   │  │ Blob/object store│
             │ (Google, …)  │   │ of Record  │  │ (uploads, temp)  │
             └──────────────┘   └────────────┘  └──────────────────┘
```

**Actors:** anonymous visitor (1 free tailoring, `FR-ONBOARD-01`), authenticated
free user, paid user (Pro / Job-hunt Pass). No admin or recruiter roles in MVP.

**External systems:** Anthropic Claude for generation + grounding (`TC-STACK-03`),
Postgres for durable data (`TC-STACK-05`), Redis/BullMQ for the async queue
(`TC-STACK-04`), an auth provider (`TC-STACK-07`), a merchant-of-record for
billing (`TC-STACK-06`). **No third-party trackers or analytics** on any page
(`BC-PRIVACY-01`).

## 3. Runtime shape

Three deployables:

| Unit | Responsibility | Notes |
|------|----------------|-------|
| **Web app** (Next.js App Router) | UI, route handlers / server actions, auth session, enqueue jobs, stream results to client | Vercel, `TC-STACK-01`, `TC-DEPLOY-01` |
| **Queue worker** (long-lived Node) | Runs the tailoring pipeline: parse → JD extract → generation pass → grounding pass → score | BullMQ consumer, `TC-STACK-04`; retries ×2 (`FR-TAILOR-03`) |
| **Datastores** | Postgres (state) + Redis (queue/rate-limit) + blob store (uploads) | `TC-STACK-05`, encrypted CV at rest `NFR-SEC-01` |

The web app never calls the LLM inline for tailoring — it **enqueues** and
streams progress, so a slow model never blocks a request (`FR-TAILOR-01`,
`NFR-PERF-01/02`).

## 4. The tailoring pipeline (core flow)

```
Client                Web (Next)            Queue (BullMQ)         Worker                 Anthropic
  │  upload CV (PDF/DOCX) │                       │                    │                       │
  │─────────────────────▶│ parse server-side ────┼──────────────────▶ text (TC-PARSE-01/02)   │
  │  paste JD             │                       │                    │                       │
  │─────────────────────▶│ extract requirements ─┼───────────────────▶│──ranked reqs─────────▶│
  │  press «Адаптувати»   │                       │                    │                       │
  │─────────────────────▶│ enqueue job ─────────▶│ queued→processing  │                       │
  │                       │                       │───────────────────▶│ generation pass ─────▶│
  │  ◀═══ stream tokens ══╪═══════════════════════╪════════════════════│ (FR-TAILOR-02)        │
  │                       │                       │                    │ grounding pass ──────▶│
  │                       │                       │                    │ (2nd strict prompt,   │
  │                       │                       │                    │  FR-BULLETS-03)       │
  │  ◀── checklist+score ─│                       │  done              │ score (pure fn)       │
```

Key properties:
- **Two-pass honesty.** Generation and grounding are separate Claude calls with
  separate prompts and no shared context (`FR-BULLETS-03`, `BC-HONESTY-01`).
- **Streaming.** First token < 3 s p95 (`NFR-PERF-01`); full result < 30 s p95
  (`NFR-PERF-02`) via Vercel AI SDK v5 (`TC-STACK-03`).
- **Fail honest.** LLM/queue/parse failures never render a blank or a
  hallucination — queue retries ×2, then a calm Ukrainian message; failed
  attempts are not charged (`FR-TAILOR-03`, `NFR-OBS-01`).
- **Scoring is deterministic.** `checklistItem(requirement, cvProfile)` and the
  0–100 weighted match score are **pure functions** in `shared/lib` — no LLM, no
  DOM, fully unit-testable (`FR-CHECKLIST-01/04`, `TC-PURE-01`).

## 5. Frontend architecture — Feature-Sliced Design

The client is organized with **Feature-Sliced Design (FSD)**: standardized
layers, sliced by business domain, with a strict one-directional import rule.

### 5.1 Layers (top imports down, never up)

```
app        → providers, root layout, global styles, routing wiring
views      → route-level compositions (FSD "pages", renamed — see 5.2)
widgets    → self-contained UI blocks (top bar, result view, pricing table)
features   → one user action each (upload-cv, run-tailoring, export-resume)
entities   → business nouns + their UI/model (cv-profile, tailoring, user)
shared     → framework-free lib, ui-kit, config, api client — depends on nothing
```

**Import rule:** a slice may import only from layers **below** it. `features`
never import `features`; cross-communication happens through a lower layer
(`entities`/`shared`) or is composed upward in `widgets`/`views`. This keeps
features independently removable — matching the PRD's capability decomposition.

### 5.2 Mapping FSD onto Next.js App Router

Next's `src/app/` directory owns routing and collides with FSD's `app`/`pages`
naming. Convention adopted here:

- `src/app/**` stays **thin** — Next route files (`layout.tsx`, `page.tsx`,
  route handlers, server actions). Each `page.tsx` renders one `views/*` slice
  and does almost nothing else.
- The FSD `pages` layer is renamed **`views`** to avoid the clash.
- Server-only concerns (parsing, LLM calls, queue producers) live in route
  handlers / server actions and delegate to `shared/lib` + server services.

### 5.3 Slices mapped to product capabilities

| FSD layer | Slices | PRD capability / IDs |
|-----------|--------|----------------------|
| `views` | `landing`, `tailor-workspace`, `history`, `account-billing`, `auth` | `FR-SALES-*`, `FR-SHELL-*`, `FR-HISTORY-*`, `FR-BILLING-*`, `FR-AUTH-*` |
| `widgets` | `top-bar`, `result-view` (two-column), `checklist-panel`, `bullet-list`, `cv-summary`, `pricing-table`, `paywall`, `billing-portal` | `FR-SHELL-01/02`, `FR-CHECKLIST-*`, `FR-BULLETS-*`, `FR-CV-03`, `FR-SALES-03`, `FR-PAYWALL-*` |
| `features` | `upload-cv`, `paste-jd`, `run-tailoring`, `edit-bullet`, `toggle-overclaim`, `export-resume`, `sign-in`, `upgrade`, `delete-profile` | `FR-CV-01/02`, `FR-JD-01`, `FR-TAILOR-01`, `FR-EDIT-01/02`, `FR-BULLETS-02`, `FR-EXPORT-*`, `FR-AUTH-*`, `FR-PAYWALL-02`, `FR-CV-05` |
| `entities` | `cv-profile`, `job-description`, `requirement`, `tailoring`, `checklist-item`, `bullet`, `user`, `subscription`, `usage-counter` | `FR-CV-04`, `FR-JD-02`, `FR-CHECKLIST-02`, `FR-TAILOR-04`, `FR-BILLING-01`, `NFR-COST-02` |
| `shared` | `ui` (design-system kit), `lib` (scoring, i18n, api client), `config` | `TC-PURE-01`, `FR-CHECKLIST-01`, `NFR-I18N-01`, design system (`DESIGN.md`) |

### 5.4 Segment convention (inside every slice)

```
<slice>/
  ui/        components (React)
  model/     state, hooks, types, store slices
  api/       requests to route handlers / server actions
  lib/       slice-local pure helpers
  index.ts   public API (barrel) — the ONLY entry other layers import
```

Slices are imported **only** through their `index.ts` public API; reaching into
internal files across slices is forbidden. This is what makes a capability
independently testable and removable.

## 6. Target directory layout

```
src/
  app/                      Next App Router (thin routes, handlers, actions)
    layout.tsx  page.tsx  globals.css
  views/                    landing, tailor-workspace, history, account-billing, auth
  widgets/                  result-view, checklist-panel, pricing-table, paywall, …
  features/                 upload-cv, run-tailoring, export-resume, edit-bullet, …
  entities/                 cv-profile, tailoring, requirement, user, subscription, …
  shared/
    ui/                     design-system components + tokens (see DESIGN.md)
    lib/
      scoring/checklist.ts  pure: checklistItem(), matchScore()   (FR-CHECKLIST-01)
      i18n/uk.ts en.ts      centralized UI strings                 (NFR-I18N-01)
      llm/                  prompt builders, gen + grounding clients
      api/                  typed client for route handlers
    config/                 env, feature flags, constants
worker/                     BullMQ consumer: parse → extract → gen → ground → score
docs/                       PRD, brief, this doc, vouch-design-system/
```

`shared/lib/**` is **framework-free** — no `next/*`, no DOM globals (`TC-PURE-01`),
so scoring, prompt building, and i18n are 100% unit-testable off the browser.

## 7. Data model (entities, condensed)

`user 1─* cv-profile`, `user 1─* tailoring`, `tailoring *─1 job-description`,
`tailoring 1─* checklist-item`, `tailoring 1─* bullet`, `user 1─1 subscription`,
`user 1─1 usage-counter`. Postgres is the store (`TC-STACK-05`); CV text is
encrypted at rest and never logged in plaintext (`NFR-SEC-01`); user IDs are
excluded from LLM payloads (`NFR-SEC-02`).

## 8. Cross-cutting concerns

| Concern | Approach | IDs |
|---------|----------|-----|
| **i18n** | Centralized strings in `shared/lib/i18n`, Ukrainian-first, English fallback; no runtime i18n lib | `NFR-I18N-01`, `BC-BRAND-01` |
| **Design** | Design tokens + kit in `shared/ui`, wired via Tailwind `@theme` | `DESIGN.md` |
| **Security / privacy** | CV encrypted at rest; no trackers; anonymized LLM payloads; GDPR export + delete | `NFR-SEC-01/02`, `BC-PRIVACY-01/02`, `NFR-GDPR-01/02` |
| **Cost control** | Per-request token budget; free tier rate-limited per IP + lifetime cap via `usage-counter` | `NFR-COST-01/02` |
| **Observability** | No silent failures; calm error surfaces; clean console on healthy session | `NFR-OBS-01/02` |
| **Rate limiting / paywall** | Redis counters gate anonymous + free usage; paywall intercepts export + 2nd tailoring | `FR-PAYWALL-01`, `NFR-COST-02` |

## 9. Current vs target

| Area | Today | Target (this doc) |
|------|-------|-------------------|
| Next shell + routing | ✅ `src/app` landing | thin routes delegating to `views` |
| Design system | ✅ tokens wired (`DESIGN.md`) | consumed via `shared/ui` |
| FSD layers | ❌ single `page.tsx` | `views/widgets/features/entities/shared` |
| Tailoring pipeline | ❌ | worker + two-pass Claude + queue |
| Auth / billing / persistence | ❌ | Auth provider + MoR + Postgres |

Build the FSD skeleton (`shared` → `entities` → `features` → `widgets` →
`views`) first; wire the pipeline behind `run-tailoring` once `shared/lib`
scoring + prompts are unit-tested.

## 10. Key decisions & rationale

- **Async queue over inline LLM** — decouples slow generation from HTTP, enables
  streaming + retry-without-charge (`FR-TAILOR-01/03`, `NFR-PERF-*`).
- **Two separate LLM passes** — grounding cannot be trusted to the same context
  that generated the text; honesty is the product (`FR-BULLETS-03`, `BC-HONESTY-01`).
- **Pure `shared/lib`** — scoring/i18n/prompts testable without a browser or a
  network, keeping the honest core deterministic and covered (`TC-PURE-01`).
- **FSD + thin App Router** — capability-per-slice matches the PRD's capability
  decomposition and keeps features independently removable.

---

**References:** `docs/cv-agent-requirements.md` (PRD, IDs), `docs/cv-agent-product-brief.md`
(narrative), `DESIGN.md` (design system), `AGENTS.md` (agent rules).
