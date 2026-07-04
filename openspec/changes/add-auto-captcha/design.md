# Design: Automatic captcha solving

## Solver

`ddddocr` via Python subprocess (`python3 scripts/solve-captcha.py`). Requires `pip install -r requirements.txt`.

## Submit flow (live tennis)

1. Playwright fills MHOA form through resident fields + rules checkbox
2. Loop up to 3 times:
   - `GET` captcha image URL from `#captchaimg_1` (wait for `naturalWidth > 0`)
   - Run OCR subprocess
   - Fill `#hdcaptcha_cp_appbooking_post_1`, click Submit Booking
   - On success → return `success`
   - On failure → click captcha image to refresh, retry
3. After 3 failures → return actionable error

## UI

Confirm step shows only "Submitting to MHOA…" — no captcha modal.

## Dependencies

- `python3` + `ddddocr` for live mode
- Document in `.env.example` and README
