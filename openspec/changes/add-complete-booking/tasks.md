## 1. Parser & validation

- [x] 1.1 Add `ParsedBookingIntent` types and `parseBookingRequest`
- [x] 1.2 Add `validateParsedBooking` for tennis rules (BC-MHOA-TENNIS-*)
- [x] 1.3 Unit tests including screenshot example (Max Bugaiov request)

## 2. Confirm & result UI

- [x] 2.1 Update `ConfirmStep` with parsed intent and validation errors
- [x] 2.2 Add captcha modal and `ResultStep` for success/failure
- [x] 2.3 Wire `IntakeForm` to parse on confirm and submit flow

## 3. MHOA tennis agent

- [x] 3.1 Implement `submitTennisBooking` Playwright agent
- [x] 3.2 API routes `/api/booking/submit` and `/api/booking/captcha`
- [x] 3.3 Stub mode for CI/E2E (default; set `COLIBRI_SUBMIT_MODE=live` for real MHOA)

## 4. Verification

- [x] 4.1 `npm test` and `npm run test:e2e` pass
- [x] 4.2 Manual stub submit with screenshot data
