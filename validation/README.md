# TinyStart — Validation Evidence

Maker ≠ checker verification for the completed MVP. Each app part has a **proof file** in `validation/proof/` that you fill in with evidence (screenshots, terminal output, video timestamps, notes).

## How to use

1. Read [`TEST_SPEC.md`](TEST_SPEC.md) — master test plan with steps, requirement IDs, and pass criteria.
2. Run the **automated gate** first (`00-automated-gate.proof.md`).
3. Work through proof files **in order** (dependencies flow top → bottom).
4. For each proof file: execute steps, record evidence, mark pass/fail, sign off.
5. When all P0 proofs pass, complete `14-demo-acceptance.proof.md` and record your course demo video.

## Proof file status

| # | Part | Proof file | Status |
|---|------|------------|--------|
| 00 | Automated quality gate | [`proof/00-automated-gate.proof.md`](proof/00-automated-gate.proof.md) | ✅ |
| 01 | Shell & navigation | [`proof/01-shell.proof.md`](proof/01-shell.proof.md) | ✅ |
| 02 | Storage & persistence | [`proof/02-storage.proof.md`](proof/02-storage.proof.md) | ✅ |
| 03 | Quick capture | [`proof/03-quick-capture.proof.md`](proof/03-quick-capture.proof.md) | ✅ |
| 04 | Motivation bridge | [`proof/04-motivation-bridge.proof.md`](proof/04-motivation-bridge.proof.md) | ✅ |
| 05 | Task breakdown | [`proof/05-task-breakdown.proof.md`](proof/05-task-breakdown.proof.md) | ✅ |
| 06 | Focus session | [`proof/06-focus-session.proof.md`](proof/06-focus-session.proof.md) | ✅ |
| 07 | Completion flow | [`proof/07-completion.proof.md`](proof/07-completion.proof.md) | ✅ |
| 08 | Today Home | [`proof/08-today-home.proof.md`](proof/08-today-home.proof.md) | ✅ |
| 09 | Daily recap (P1) | [`proof/09-daily-recap.proof.md`](proof/09-daily-recap.proof.md) | ✅ |
| 10 | Accessibility | [`proof/10-accessibility.proof.md`](proof/10-accessibility.proof.md) | ✅ |
| 11 | UX & brand constraints | [`proof/11-ux-brand-constraints.proof.md`](proof/11-ux-brand-constraints.proof.md) | ✅ |
| 12 | Browser smoke | [`proof/12-browser-smoke.proof.md`](proof/12-browser-smoke.proof.md) | ✅ |
| 13 | End-to-end flows | [`proof/13-e2e-flows.proof.md`](proof/13-e2e-flows.proof.md) | ✅ |
| 14 | Demo acceptance | [`proof/14-demo-acceptance.proof.md`](proof/14-demo-acceptance.proof.md) | 🟡 |

**Legend:** ⬜ not started · 🟡 in progress / blocked · ✅ passed · ❌ failed

**Last run:** 2026-07-10 — see [`test_report/TEST_REPORT.md`](test_report/TEST_REPORT.md)

## Evidence types

| Type | When to use | Where to store |
|------|-------------|----------------|
| Terminal output | Automated gate, unit tests | Paste into proof file or `validation/evidence/terminal/` |
| Screenshot | UI behavior, a11y, browser | `validation/evidence/screenshots/<part>/` |
| Screen recording | Flows, demo, timer behavior | Link in proof file (YouTube, Loom, etc.) |
| Unit test reference | `lib/` logic | Cite test file + command output in proof file |

## Related docs

- [`docs/requirements.md`](../docs/requirements.md) — requirement IDs (`FR-*`, `NFR-*`, `BC-*`)
- [`docs/APP_SPEC.md`](../docs/APP_SPEC.md) — flows (§7), routes (§8), screens (§9)
- [`docs/verification.md`](../docs/verification.md) — a11y/perf checklist (complements this folder)
- [`test_report/SCORECARD.md`](test_report/SCORECARD.md) — scored validation report with tables, critical points, gaps
- [`test_report/TEST_REPORT.md`](test_report/TEST_REPORT.md) — summary + re-run instructions
