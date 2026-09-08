# Rubric: trajectory quality (slice diff + commit trail)

The rubric the `eval-judge` applies during `/run-slice`'s **trajectory-eval** step. It
grades **how a slice was built**, not whether it is functionally correct (the gates and
the code/security reviewers own correctness). It is the **judgment layer** that the
deterministic `scripts/check-trajectory` explicitly defers to: that gate proves only the
git-visible facts (trailers, review-evidence-before-done, cross-slice overlap) and states
in its own honesty boundary that test-first ordering, test-weakening, and substantive
process are **graded here by an LLM judge, not there**.

## The case

- **Input:** the slice diff (`git diff main...HEAD`), its commit trail (order, messages,
  trailers), the slice's `docs/specs/NNN-*.md`, and the agents' reports for the run.
- **Output:** the `eval-judge` verdict `{score, pass, criteriaMet, criteriaMissed,
  reasoning}`.

## How to judge (for the eval-judge)

Judge each named criterion below strictly against the evidence, citing it (`path:line`,
diff hunk, commit sha/subject, or a report quote). Then apply the CRITICAL gate:

> **If any `CRITICAL` criterion is unmet -> `pass = false` and `score <= 49`,** regardless
> of the others. If every CRITICAL criterion is met -> `pass = true`, `score` in 50–100
> from the non-critical criteria (weights below).

On a FAIL, phrase `reasoning` as a **diagnosis the implementer can act on** ("what to
rework, and how, test-first"), because `/run-slice` routes it back as rework — it never
rolls back.

## Criteria

### `test-first-red-before-green` — CRITICAL

The acceptance tests existed and **failed before** the implementation made them pass.

- **Met:** commit order shows the tests landing before (or the RED state preceding) the
  implementation; the tests carry `@trace <FR-ID>` for the slice's requirements; the
  RED-for-the-right-reason evidence is present in the trail/reports.
- **Not met:** tests and implementation appear together with no evidence the tests ever
  failed; tests were added **after** a passing implementation to rubber-stamp it; the
  acceptance tests never went RED.

### `no-test-weakened` — CRITICAL

No test was **weakened, skipped, deleted, or narrowed to force a gate green.**

- **Met:** the diff shows acceptance tests strengthened or unchanged in rigor; new tests
  are specific and can fail.
- **Not met (any one):** an assertion removed or loosened (e.g. reduced to `assert True`
  or a bare `pytest.raises(Exception)`); a test marked `skip`/`xfail`/commented out to get
  past red; a test deleted and not replaced by an equal-or-stronger one; an assertion
  retargeted from the behavior to a mock. Weakening a test to force green is the exact
  failure this rubric exists to catch.

### `in-scope` — non-critical (weight 0.4)

The change stayed within the slice's **declared scope.**

- **Met:** touched paths map to the spec's requirements; nothing from the spec's **Out of
  scope** section was implemented; no opportunistic refactor of unrelated code.
- **Not met:** scope creep into another slice's requirements, or drive-by changes the spec
  did not authorize.

### `loop-followed` — non-critical (weight 0.3)

The maker/checker/judge loop was actually followed.

- **Met:** the gates were run and green; an **independent** review happened (maker was not
  the reviewer); rework addressed findings at the root cause rather than bypassing them;
  a schema change shipped an Alembic migration.
- **Not met:** gates skipped, review self-performed by the author, or findings
  side-stepped instead of fixed.

### `honest-reporting` — non-critical (weight 0.3)

Reporting was truthful.

- **Met:** no "done"/green claim while a gate was red; reports show **real command
  output** as evidence; each agent declared its `Skills used:`; anything skipped or
  unverified is stated plainly.
- **Not met:** a green/done claim contradicted by the gates; fabricated or absent
  verification; silent skips.

## Score guidance (only when the CRITICAL gate is passed)

Start at 100 and deduct for weak non-critical criteria per their weights; a criterion
partially met loses part of its weight. Reserve **90+** for a slice that is clearly in
scope, followed the loop, and reported honestly with strong evidence. A pass with notable
non-critical gaps lands in the 50–89 band, with the gaps named in `criteriaMissed`.
