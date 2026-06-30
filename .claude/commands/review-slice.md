---
description: Run the two-checker review (kurs-reviewer + kurs-eval-judge) on the built «Гривня» slice. Maker ≠ checker is enforced.
argument-hint: <capability> (e.g. converter)
---

Run the independent two-checker review on the **$1** slice. The agent that built
the slice must NOT be either checker (maker ≠ checker, ADR-0003).

Steps:

1. **Pre-flight.** Confirm the slice is built and `npm run verify` is green. If
   verify is red, stop and report — there is nothing to review until it is green.

2. **Checker #1 — spec compliance + correctness.** Dispatch the **kurs-reviewer**
   subagent on the `$1` slice (its spec, diff, and the correctness rules). It writes
   findings to `docs/qa/review-findings.md` and returns **CLEAN** or
   **CHANGES REQUESTED**.

3. **Checker #2 — quality.** Dispatch the **kurs-eval-judge** subagent on the `$1`
   slice's eval cases and user-facing strings. It writes `docs/qa/eval-report.md`
   with per-case scores and a verdict.

4. **Collate.** Summarise both verdicts. If either requested changes or failed an
   eval case:
   - hand the specific findings back to **kurs-maker** to fix (the makers fix, not
     the checkers),
   - then re-run this command until both checkers are clean.

5. **On clean.** Both checkers clean → the slice may be archived:
   ```bash
   npx --no-install openspec archive "add-$1" --yes
   ```
   Then update `docs/current-state.md` and remind me to commit with `Slice:` /
   `Refs:` trailers (the commit-msg hook enforces them).
