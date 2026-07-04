# Proposal: Automatic captcha solving

## Problem

Live MHOA tennis submission pauses for manual captcha entry. The captcha image often fails to render in the modal (blank/dark block), and the user wants the agent to solve captcha without human input.

## Solution

- Fetch captcha PNG bytes directly from MHOA (not element screenshot)
- Solve server-side with `ddddocr` (Python) via `scripts/solve-captcha.py`
- Complete submission in one `/api/booking/submit` call with up to 3 captcha retries (FR-SUBMIT-05)
- Remove captcha modal from the UI

## Out of scope

- Picnic captcha / JotForm
- Paid third-party captcha APIs
