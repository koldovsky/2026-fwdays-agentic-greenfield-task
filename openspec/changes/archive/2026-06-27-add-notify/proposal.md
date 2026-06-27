## Why

A reminder that never announces itself is useless. When the app is open and the next
break is due, the user should get a gentle nudge with two honest choices — and the
permission for that nudge must be earned, never grabbed on load (FR-NOTIFY-01…05, BC-NOTIFY-01).

## What Changes

- When the next-reminder time is reached while the app is open, raise a Notification
  (Notification API) plus an in-app card (FR-NOTIFY-01).
- The notification/card offers two actions: "Took a break" and "Snooze {n} min" (FR-NOTIFY-02).
- Notification permission is requested only on an explicit user action — enabling
  reminders — never silently on load (FR-NOTIFY-03, BC-NOTIFY-01).
- If permission is denied, fall back to the in-app card only, with no error (FR-NOTIFY-04).
- A short sound plays with the notification only when `soundEnabled` is true (FR-NOTIFY-05).

## Capabilities

### New Capabilities
- `notify`: detect when a break is due while open, request permission politely, and surface the due-break nudge with its two actions.

### Modified Capabilities
<!-- none -->

## Impact

- New code: a notification controller (client) + the due-break card under `src/components/`.
- Depends on `reminder-engine` (next-reminder time, `computeSnooze`), `settings`
  (`enabled`, `soundEnabled`), and `shell` (renders the card).
- Produces the action signals that `stats` will record. No background push (out of scope, FR-PWA-03).
