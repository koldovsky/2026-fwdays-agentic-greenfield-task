# TinyStart — Verification Checklist

Sign-off for OpenSpec change #8 (a11y / perf / browser pass).

## Automated gate (NFR-DX-01)

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## Accessibility (NFR-A11Y-01/02/03)

- [x] Skip-to-content link on shell routes and focus mode
- [x] Visible `:focus-visible` rings globally (`app/globals.css`)
- [x] Timer and step progress use `aria-live` in focus session
- [x] Form inputs have associated labels
- [x] Reflection tags use `aria-pressed` (not color-only)
- [x] `prefers-reduced-motion` disables non-essential animation

## UX constraints (BC-UX / BC-BRAND)

- [x] Timer never uses aggressive red styling (`BC-UX-01`)
- [x] One primary CTA per screen on Home and focus preset picker (`BC-UX-03`)
- [x] Snooze is shame-free with text confirmation (`BC-UX-02`, `FR-HOME-05`)
- [x] Copy avoids guilt / hustle language — verified in `lib/a11y/verification.test.ts`

## Performance (NFR-PERF-01/02)

- [x] Focus session starts synchronously from local storage (< 1s)
- [x] Landing → preset → focus flow ≤ 2 clicks (`FR-FOCUS-08`)
- [x] No blocking network requests in core loop (device-local MVP)

## Browser support (NFR-BROWSER-01)

Manual smoke test in latest:

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

Routes to verify: `/`, `/tasks/new`, `/tasks/[id]`, `/focus/[taskId]`, `/recap`

## Demo acceptance (BC-DEMO-01)

Follow [`docs/demo-capabilities.md`](demo-capabilities.md) — Demo Phase 0 rehearsal, then Demo Phase 2 capture slices.

- [ ] User completes a 2–5 minute session without confusion
- [ ] UI feels calm during demo recording
- [ ] All `demo-capture-*` slices recorded (create → breakdown → focus → completion → recap)
- [ ] `demo-narration-agentic` covers ≥3 agentic practices with repo evidence
- [ ] Video ≤2 min uploaded; PR link in homework template

---

*Last updated: 2026-07-10*
