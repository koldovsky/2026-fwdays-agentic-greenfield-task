## Context

Intake change shipped manual contact fields for every booking. Homework demo uses two real household members at the same address. Parser already handles `from X to Y` but not `between X and Y`.

## Goals / Non-Goals

**Goals:**

- `RESIDENT_PROFILES` constant with Max + Nataliia (name, email, phone, address)
- Default selection: Max on page load and after **New booking**
- Profile selected → hide name/email/phone/address inputs; data still on confirm + submit
- **Other** → show full contact form
- Parse `between 12 AM and 1 PM` → `00:00–13:00`

**Non-Goals:**

- Profile CRUD UI, auth, localStorage persistence

## Decisions

### 1. Profiles as code constant

**Choice:** `src/lib/booking/residents.ts` — no DB.  
**Rationale:** OOS-ACCT-01; demo/homework scope.

### 2. Hide vs disable contact fields

**Choice:** Do not render contact fields when `residentId !== null`.  
**Rationale:** Cleaner UX; values remain in React state from `intakeFromResident`.

### 3. `between` regex before generic range

**Choice:** Dedicated `between X and Y` match requiring AM/PM on both tokens.  
**Rationale:** Avoids `12 AM` noon typo heuristic when end is explicitly `PM`.

## Risks / Trade-offs

| Risk | Mitigation |
| ---- | ---------- |
| Hidden fields confuse users | Confirm step shows full contact details |
| Profile data stale | Edit `residents.ts`; document in README |
