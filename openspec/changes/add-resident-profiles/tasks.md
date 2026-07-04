## 1. Resident profiles

- [x] 1.1 Add `src/lib/booking/residents.ts` (Max, Nataliia)
- [x] 1.2 Add `ResidentPicker` component
- [x] 1.3 Wire intake form — pre-fill, hide contact fields when profile selected

## 2. Parser fix

- [x] 2.1 Support `between X and Y` in `parseTimeWindow` (FR-NLP-02)
- [x] 2.2 Unit test: "Monday between 12 AM and 1 PM 1 slot"

## 3. Verification

- [x] 3.1 E2E: profile hides contact fields; Other shows them
- [x] 3.2 `npm test`, `npm run lint`, `npm run test:e2e` pass
- [x] 3.3 `npx openspec validate add-resident-profiles --strict`
