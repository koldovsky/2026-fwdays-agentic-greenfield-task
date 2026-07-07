# Demo Script

Target length: 1-2 minutes.

Generated repository demo video: `demo/loopledger-demo.mp4`.

## 0:00-0:15: Product

"This is LoopLedger, a tiny Python CLI for keeping agentic engineering evidence in one
auditable JSON file. It helps a reviewer see context, loops, checks, maker/checker
separation, and spec-first decisions."

## 0:15-0:45: CLI Flow

```bash
PYTHONPATH=src python -m loopledger.cli audit examples/agentic-homework.loopledger.json --strict
PYTHONPATH=src python -m loopledger.cli report examples/agentic-homework.loopledger.json
```

Show that the audit reports `5/5` and the report lists practices, cycles, checks, and
decisions.

## 0:45-1:20: Agentic Engineering Evidence

"I used `AGENTS.md` for static context, `docs/specification.md` for SDD,
`docs/agentic-process-log.md` for the loop record, tests and evals for verification,
and `docs/checker-review.md` as the separate checker pass."

## 1:20-1:45: Verification

```bash
python -m unittest discover -s tests
python evals/evaluate.py
```

Close with: "The project is small, but it went through the full engineering loop and
the evidence is visible in the PR."
