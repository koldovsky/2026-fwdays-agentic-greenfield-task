## 1. Permission & detection

- [x] 1.1 Feature-detect Notification support; treat unsupported as card-only
- [x] 1.2 Request permission only from the "enable reminders" action handler (FR-NOTIFY-03, BC-NOTIFY-01)
- [x] 1.3 Add a client controller comparing now vs. engine next-reminder time, firing once per target (FR-NOTIFY-01)
- [x] 1.4 Re-check on `visibilitychange` so returning users see the due state

## 2. Nudge & actions

- [x] 2.1 Build the due-break card (DESIGN.md `signal` state) with "Took a break" + "Snooze {n} min" (FR-NOTIFY-02)
- [x] 2.2 Mirror the card as a Notification when permitted; card-only fallback when denied (FR-NOTIFY-04)
- [x] 2.3 "Took a break" clears due state and recomputes next reminder; "Snooze" reschedules via `computeSnooze`
- [x] 2.4 Play a short sound only when `soundEnabled`, swallowing autoplay failures (FR-NOTIFY-05)

## 3. Verify

- [x] 3.1 Unit-test the due-crossing/once-per-target logic (clock injected, not read)
- [x] 3.2 Manually verify denied-permission fallback raises no error
- [x] 3.3 Run `npm run lint && npm run typecheck && npm test && npm run build`; `npx openspec validate add-notify --strict`
