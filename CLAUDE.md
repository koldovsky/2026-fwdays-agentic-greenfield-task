# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this repo is

Homework for **fwdays Academy · Agentic Engineering: Greenfield**. The deliverable
is a **Pull Request judged on evidence of agentic engineering process** (context
engineering, loops, maker ≠ checker, verification) — not on product size or stack.
See `README.md` (in Ukrainian) for the assignment. CodeRabbit auto-reviews the PR
in Ukrainian as a course mentor (advisory, non-blocking).

## Project

**A Telegram agent for a music school.** Scope and stack are being defined — this
section will be filled in as decisions are made. (Stack is intentionally free per
the assignment.)

## Workflow

- **Spec-driven development via OpenSpec.** `openspec/` is configured `spec-driven`;
  the `openspec` CLI is installed. Turn requirements into change proposals
  (spec deltas + tasks) under `openspec/changes/`, implement per capability, verify.
- OpenSpec skills/commands live in `.claude/skills/openspec-*` and `.claude/commands/opsx/`.

## Conventions

- Work happens on a feature branch (currently `feat/music-school-agent`), never on `main`.
- When opening the PR, fill in `.github/pull_request_template.md`: real name, demo-video
  link, and which decisions were the human's vs. the agent's.
