## Context

Greenfield Next.js 16 app with default scaffold. PRD at `docs/requirements.md` defines
MHOA integration requirements from live site inspection (2026-07-03). Tennis uses an
inline WordPress form; picnic uses a JotForm iframe wizard. This change builds only the
**our-app intake layer** — not MHOA automation yet.

## Goals / Non-Goals

**Goals:**

- Single booking page where a resident selects MHOA + facility and enters all FR-INPUT fields.
- Client validation matching MHOA format expectations (email, phone patterns, required fields).
- Accessible form (NFR-A11Y-01): labels, focus rings, error association.
- Typed intake payload passed to a future confirm/submit pipeline via React state or server action stub.

**Non-Goals:**

- Playwright / browser automation (submission change).
- LLM or rules-based NL parsing (NLP change).
- Styling beyond clean Tailwind defaults — no design system yet.

## Decisions

### 1. Route: `/book` as the intake entry point

**Choice:** `src/app/book/page.tsx`  
**Rationale:** Clear URL for demo video; home page stays scaffold until later.  
**Alternative:** Replace home page — rejected to keep homework scaffold visible.

### 2. Form state: React client component with local state

**Choice:** `"use client"` form component; no database.  
**Rationale:** OOS-ACCT-01 — no persistence in MVP. Server action accepts payload and returns ack stub.  
**Alternative:** Full server form — unnecessary without persistence.

### 3. Phone validation: dual pattern by facility

**Choice:** Accept North-American formats; normalise display hints per facility  
(tennis `###-###-####`, picnic `(000) 000-0000` per PRD FR-INPUT-02).  
**Rationale:** Matches inspected MHOA field formats.  
**Alternative:** Single E.164 only — rejected; MHOA forms use local formats.

### 4. Confirm step: UI shell with stub parsed intent

**Choice:** After valid submit, show structured preview with placeholder parsed fields  
(`facility`, `date TBD`, `window TBD`) until NLP change ships.  
**Rationale:** Satisfies FR-INPUT-06 layout without blocking on parser.  
**Alternative:** Block until NLP exists — rejected; breaks incremental delivery.

### 5. Module layout

```
src/
  app/book/page.tsx
  components/booking/intake-form.tsx
  components/booking/facility-selector.tsx
  lib/booking/validation.ts
  lib/booking/types.ts
```

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| Stub confirm step feels incomplete | Label clearly as “preview — parsing coming next”; disable final submit |
| Phone regex too strict/loose | Test against PRD examples; allow common separators |
| Facility list drifts from MHOA | Source facility enum from PRD IDs; single constants file |

## Open Questions

- Whether to split first/last name inputs in UI vs single full-name field (PRD allows either; MHOA tennis uses one field, picnic uses two — recommend single field with optional split later).
- i18n: English-only for MVP (NFR-I18N-01).
