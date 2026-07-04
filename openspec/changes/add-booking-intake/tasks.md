## 1. Types and validation

- [x] 1.1 Add `src/lib/booking/types.ts` with `ProviderId`, `FacilityType`, `BookingIntake` aligned to PRD FR-INPUT-* fields
- [x] 1.2 Add `src/lib/booking/validation.ts` with validators for email, phone, address, full name, NL request min length (FR-INPUT-05)
- [x] 1.3 Add unit tests for validation helpers (valid/invalid email, phone, short NL request)

## 2. UI components

- [x] 2.1 Create `FacilitySelector` — Mahogany HOA fixed provider + tennis/picnic toggle; note unbookable facilities (FR-PROV-02/03)
- [x] 2.2 Create `IntakeForm` client component with all FR-INPUT fields and field-level errors
- [x] 2.3 Add automation disclosure + attestation checkbox (NFR-LEGAL-01)
- [x] 2.4 Create confirm-step panel showing captured values + parsed-intent placeholder (FR-INPUT-06 shell)

## 3. Page and routing

- [x] 3.1 Add `src/app/book/page.tsx` rendering intake flow
- [x] 3.2 Link from home page to `/book` for discoverability
- [x] 3.3 Ensure WCAG focus rings and aria-describedby on errors (NFR-A11Y-01)

## 4. Verification

- [x] 4.1 `npm run lint && npm run build` pass
- [x] 4.2 Manual check: invalid submit shows per-field errors; valid submit reaches confirm step with disabled MHOA submit

## 5. Playwright E2E (openspec-change-testing)

- [x] 5.1 Add `playwright.config.ts` + `tests/e2e/landing.spec.ts`
- [x] 5.2 Add `tests/e2e/booking-intake.spec.ts` covering key OpenSpec scenarios
- [x] 5.3 Add `tests/e2e/a11y.spec.ts` (axe, NFR-A11Y-01)
- [x] 5.4 `npm run test:e2e` passes
