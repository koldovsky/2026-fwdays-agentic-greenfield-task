# Perf Audit

Measure landing-page performance against the NFR-PERF-04 mobile budget (LCP < 2.5 s, TBT < 200 ms, throttled Lighthouse vs `next start`). Use after any change touching the landing page, fonts, global CSS, or root layout.

Invoked as `/perf-audit`. The argument (if any) names the route to audit (default `/`).

Repeatable Lighthouse audit. Full history, diagnosis, and remaining headroom live in `docs/perf/log.md` — read it first; budgets and the method are fixed there. Current LCP margin is ~20 ms — treat any regression as a blocker.

**Steps**

1. **Read the log.** `docs/perf/log.md` — baseline numbers, per-fix deltas, known dead ends, next levers.

2. **Production build + serve** (never `next dev`): `yarn build`, then `PORT=3100 yarn start`.

3. **Lighthouse 12 CLI**, mobile, default simulated throttling (slow 4G / 4× CPU), headless Chrome:
   `npx lighthouse http://localhost:3100 --form-factor=mobile --screen-emulation.mobile --chrome-flags="--headless=new" --only-categories=performance --output=json --output-path=docs/perf/run-$(date +%Y%m%d-%H%M).json`
   Run 2–3 times; confirm numbers are stable before trusting a delta.

4. **Compare** LCP / TBT / CLS vs budget and vs the latest `docs/perf/log.md` numbers.

5. **Report + log.** Pass/fail per metric with measured values. On any meaningful change, append a dated entry to `docs/perf/log.md` with metric deltas and cause.

6. **Handoff.** Update `docs/current-state.md`.

**Guardrails**
- Never measure against `next dev`.
- A budget breach is a blocker — find the offending change, do not tune the budget.
- CLS must stay 0 — landing animations are constrained to transform/opacity.
