# Tasks — add-risk-scoring

- [x] Write capability spec scenarios (`openspec/specs/risk-scoring/spec.md`)
- [x] Write failing unit tests for parse / rules / score
- [x] Implement `src/lib/parse.ts` (zod boundary)
- [x] Implement `src/lib/rules/*` pure predicates
- [x] Implement `src/lib/score.ts` (scorer + classify + rank)
- [x] Implement `src/lib/summarize.ts` (FR-OUT-02 constraints)
- [x] Wire `src/cli.ts` shell + exit code (BC-EXIT-01)
- [x] Eval harness + dataset + baseline ratchet
- [x] Pre-commit hook + CI gate
- [x] Separate reviewer pass (maker ≠ checker)
