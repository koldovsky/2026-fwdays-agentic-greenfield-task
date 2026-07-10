# loop/latest/manifest.md — the preflight manifest

`loop/latest/manifest.md` is `spec-loop-preflight`'s output and `spec-loop`'s input. It is the **planned, validated backlog**:
the cross-spec dependency map plus, per spec, everything the loop needs so it can start at implementation instead
of re-planning. It is plain Markdown — a human reviews it at the checkpoint; the loop reads each spec's section as
the planner's brief.

`spec-loop` **consumes it if present** (skipping its own Gate 0) and **falls back to inline planning** if absent or
if a spec is missing (e.g. one added after preflight ran). So the manifest is an enhancement, not a contract the loop
breaks without.

## Structure

```markdown
# Loop MANIFEST

Produced by spec-loop-preflight on <loop-now>. Validated, planned backlog for spec-loop to consume.
Re-run spec-loop-preflight to refresh after specs are added/changed/removed (idempotent).

## Cross-spec dependency map

| spec               | provides                           | consumes                              | routes / screens |
| ------------------ | ---------------------------------- | ------------------------------------- | ---------------- |
| add-item-detail    | detail view, initial-position read | saved position (← add-position-cache) | /items/:id       |
| add-position-cache | saved position (persistent store)  | item id (← add-item-list)             | —                |

## Backlog verdict summary

| spec               | quality                   | security-surface | security-critical | seam-tests              | top risk                 |
| ------------------ | ------------------------- | ---------------- | ----------------- | ----------------------- | ------------------------ |
| add-position-cache | SOUND                     | no               | no                | 1 (position round-trip) | store migration ordering |
| add-auth-connect   | GAP: dangling token store | yes (creds)      | yes               | 2                       | credential storage       |

## Per-spec plans

### add-position-cache

- **Quality verdict:** SOUND — faithfully implementing this yields a working resume journey.
- **Distilled brief:** invariants that apply (e.g. "persistence strategy is per-integration"); the _relevant_
  design excerpts (quoted, not dumped); files to create/edit. Downstream agents read THIS, not the whole corpus.
- **Plan:** ordered steps keyed to `tasks.md`, each naming the file(s) it touches.
- **Real-journey acceptance:** the concrete user journey(s) this spec must make pass on the real stack — what to
  drive, what to assert, including any cross-session / cross-subsystem seam. This is what Gate 2 verifies.
- **Security surface:** no. **Security-critical:** no. _(When yes: name the surface — creds / auth / a trust
  boundary / an injection sink / deserialization / path / network / risky deps.)_
- **Extra-test obligations (seams):** "position round-trip — a test must write a position via this cache and read it
  back from the resume path; mocking the store is disallowed for this proof." One bullet per seam.
- **Traceability:** consumes `item id` ← provided by `add-item-list` (archived ✓). Provides `saved position`
  → consumed by `add-item-detail` (pending; must land **before** it). No dangling contracts.
- **Risks / invariants:** load-bearing invariants or boundaries this change brushes against.

### add-auth-connect

- **Quality verdict:** GAP — consumes a "token store" no spec provides (dangling contract). The loop will try to
  close it as connective tissue toward the declared connect journey; if it can't within budget → triage.
- ... (same fields) ...
- **Security surface:** yes (credential storage + network auth). **Security-critical:** yes — gets a deep review at
  its own Gate 2 _and_ in the end-of-run pass.
```

## Field reference

- **Quality verdict** — `SOUND`, or the specific gap + the seam the loop will try to close. A verdict of
  "unimplementable as written" or "missing scope is real design work" is a **human blocker** preflight surfaces at the
  checkpoint, not something the loop silently builds around.
- **Distilled brief** — the handful of invariants that actually apply, the relevant design excerpts (quote, don't
  dump), and the files to touch. Exists so the implementer and verifier don't each cold-read the whole design corpus.
- **Real-journey acceptance** — must be real, not mock-satisfiable; it is the spec for Gate 2's verifier.
- **Security-surface flag** — drives the **end-of-run** deep security review (the union of all flagged surfaces,
  reviewed once over the finished system).
- **Security-critical flag** — the rare opt-in: this spec _defines_ a security boundary (e.g. a credential store,
  an auth gate, a trust boundary between untrusted input and privileged code), so it also gets a deep review at
  its own Gate 2, not only at the end.
- **Extra-test obligations** — one per cross-spec seam in the dependency map; the verifier MUST satisfy each with a
  test that crosses the seam (never each side against a mock). The stop-judge confirms none was skipped.
- **Traceability** — for each consumed datum/route/contract, the providing spec (archived or pending, with required
  ordering); or an explicit **dangling contract** if none provides it.

## How the loop reads it

Per spec `S`, `spec-loop` uses the manifest's `### S` section as the planner output it would otherwise compute:
the **brief + plan + journey acceptance** feed the implementer and verifier; the **extra-test obligations** are
handed to the verifier; the **security-critical** flag (not merely the surface flag) decides whether the dedicated
security agent runs at _that spec's_ Gate 2; the **security-surface** flags accumulate into the end-of-run review.
Anything the manifest doesn't cover (a newly-added spec) → the loop plans it inline with the same `spec-loop-planner`.
