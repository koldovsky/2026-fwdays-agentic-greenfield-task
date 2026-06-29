# Product Brief — tf-guard

> Companion to [requirements.md](requirements.md). The requirements document is the
> numbered, traceable source of truth; this brief is the narrative behind it.

## What this is

`tf-guard` is a tiny command-line guardrail for Terraform changes. You pipe a
`terraform plan -json` into it; it tells you — ranked by risk — what in this change
could hurt: resources missing ownership/environment tags, and destructive actions
(delete/replace) on stateful resources like databases, buckets and disks.

It is **keyless and offline by design**. There are no accounts, no API keys, no
network calls. It reads a plan file you already have and prints a report. That makes
it safe to run in any CI pipeline and trivial to reason about.

## Who it is for

Platform / DevOps engineers who review a lot of Terraform PRs and want a fast,
deterministic "what's dangerous here?" pass before a human reads the diff — and a
hard gate (non-zero exit) so the truly dangerous changes can't sail through CI
unnoticed.

## Why it exists (for this course)

It is deliberately small but carries the full agentic-engineering loop end to end:

- a **pure, testable core** (`lib/scoring`) — the kind of deterministic capability the
  course slices out (`comfort-score` in the reference; `risk-score` here);
- **tests** for the deterministic part and **evals** for the human-readable summary,
  to demonstrate *Tests vs Evals* honestly;
- **specs, rules, and ADRs in the repo** so any agent can rebuild the context cold.

## What it is not

Not a Terraform replacement, not a policy engine like OPA/Sentinel, not a cloud
scanner. It is one well-built capability that shows the process.
