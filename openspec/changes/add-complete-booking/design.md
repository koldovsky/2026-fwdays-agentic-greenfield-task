## Context

Intake change (`add-booking-intake`) ships the form and confirm shell. PRD requires NL parsing, MHOA validation, and Playwright submission with captcha. Tennis form uses CPF/WordPress field IDs observed on mahoganyhoa.com (2026-07-03).

## Goals / Non-Goals

**Goals:**

- Parse screenshot-style requests: *“Monday next week from 11 AM to 12 AM for 1 slot”*
- Validate tennis lead time (no same-day, max 7 days), 45-min slots, operating hours
- Submit tennis booking via Playwright; captcha solved by user in UI
- Stub mode (`COLIBRI_SUBMIT_MODE=stub`) for unit/E2E without live MHOA

**Non-Goals:**

- Picnic JotForm wizard, signature pad, payment
- LLM-based parsing — deterministic rules parser only
- Persisting booking history

## Decisions

### 1. Rules-based parser with reference date

**Choice:** `parseBookingRequest(text, facility, referenceDate)` — injectable `Date` for tests.  
**Rationale:** Reproducible unit tests; no API keys. Handles weekdays, “next week”, AM/PM windows, East/West court.  
**Ambiguity:** `12 AM` after morning start → treat as noon (12 PM); flag if still invalid.

### 2. Validation returns structured errors linked to PRD IDs

**Choice:** `{ ok: true, parsed } | { ok: false, errors: [{ code, message }] }`  
**Rationale:** Maps to FR-VALID-TENNIS-01 messages on confirm step.

### 3. Two-phase submit API

**Choice:**

1. `POST /api/booking/submit` — parse, validate, start Playwright, fill form, return `{ status: 'captcha_required', sessionId, captchaImage }` or `{ status: 'success' | 'error', ... }`
2. `POST /api/booking/captcha` — `{ sessionId, code }` completes submit

**Rationale:** TC-CAPTCHA-01 mandates human captcha; no OCR in MVP.

### 4. In-memory submit sessions

**Choice:** Map `sessionId → BrowserContext` in module scope (dev/MVP). TTL 10 min.  
**Rationale:** OOS-ACCT-01 — no DB. Acceptable for homework demo.

### 5. Slot selection

**Choice:** After court + date, click first available slot link within parsed window matching 45-min tennis slots.  
**Rationale:** FR-NLP-02 “any slot in window”; availability from MHOA DOM (link vs plain text).

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| MHOA DOM changes | Centralise selectors; fail with FR-RESULT-02 provider-down message |
| Captcha session timeout | 10 min TTL; user can restart |
| Playwright in serverless | Dev/local only; document requirement |
