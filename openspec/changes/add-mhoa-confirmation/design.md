# Design: MHOA-approved booking confirmation

## Approval gate

Live submit returns `status: "success"` with `mhoaApproved: true` **only** when MHOA body contains:

- `We have received your Tennis Court Booking` (exact phrase, case-insensitive)

Loose matches on form navigation text (`Tennis Courts & Booking`) are **rejected**.

Known MHOA errors (e.g. `Number of allowed appointments exceeded`) return `status: error` immediately.

## Success payload

```typescript
{
  status: "success",
  mhoaApproved: boolean,
  confirmedAt: string, // ISO-8601
  fullName: string,
  email: string,
  runId, facility, date, slot, court,
  confirmationText?: string
}
```

## Stub mode

`mhoaApproved: false`; confirmation text states stub/demo.

## Audit (FR-SUBMIT-07)

`console.info` JSON line: `{ event, runId, facility, date, slot, court, fullName, email, mhoaApproved }` — no phone/address/captcha.

## UI

Result step headline: **Confirmed by Mahogany HOA** when `mhoaApproved`; **Booking recorded (demo)** when stub.
