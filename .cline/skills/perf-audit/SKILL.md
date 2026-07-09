---
name: perf-audit
description: Measure landing-page performance against the NFR-PERF-04 mobile budget (LCP < 2.5 s, TBT < 200 ms, throttled Lighthouse vs next start). Use after any change touching the landing page, fonts, global CSS, or root layout, or on "perf audit", "check LCP", "run Lighthouse". The LCP margin is ~20 ms — re-run after every landing change.
metadata:
  author: vouch
  version: "1.0"
---

Repeatable Lighthouse audit for the landing page. Full history, diagnosis, and
remaining headroom live in `docs/perf/log.md` — read it first; budgets and the
method are fixed there.

**Budgets (NFR-PERF-04, mobile throttled):** LCP < 2.5 s, TBT < 200 ms, CLS 0.
Current margin is ~20 ms on LCP — treat any regression as a blocker.

**Steps**

1. **Read the log.** `docs/perf/log.md` — baseline numbers, per-fix deltas,
   known dead ends (e.g. font-weight clamping does nothing; Google serves
   identical bytes), and next levers if headroom is needed.

2. **Production build + serve** (never `next dev`):
   ```
   yarn build
   PORT=3100 yarn start
   ```

3. **Lighthouse 12 CLI**, mobile form factor, default simulated throttling
   (slow 4G / 4× CPU), headless Chrome:
   ```
   npx lighthouse http://localhost:3100 \
     --form-factor=mobile --screen-emulation.mobile \
     --chrome-flags="--headless=new" \
     --only-categories=performance \
     --output=json --output-path=docs/perf/run-$(date +%Y%m%d-%H%M).json
   ```
   Run 2–3 times; simulated throttling is mostly deterministic but confirm the
   numbers are stable before trusting a delta.

4. **Compare** LCP / TBT / CLS against the budget and against the latest
   numbers in `docs/perf/log.md`. Extract:
   `jq '.audits | {lcp: .["largest-contentful-paint"].numericValue, tbt: .["total-blocking-time"].numericValue, cls: .["cumulative-layout-shift"].numericValue}' <report>`

5. **Report + log.** Pass/fail per metric with the measured values. On any
   meaningful change (fix or regression), append a dated entry to
   `docs/perf/log.md` — metric deltas + what caused them. Keep `baseline.json`
   / `after.json` semantics: update `after.json` only for accepted states.

6. **Handoff.** Update `docs/current-state.md`.

**Guardrails**
- Never measure against `next dev` — numbers are meaningless.
- A budget breach is a blocker: identify the offending change (`git diff`) and
  report it; do not tune the budget.
- CLS must stay 0 — landing animations (see `openspec/changes/landing-animations`)
  are constrained to transform/opacity for this reason.
