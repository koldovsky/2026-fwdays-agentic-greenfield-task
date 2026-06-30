# Agent tooling — Claude Code · Cursor · Codex

> The «Гривня» loop is designed to run in any of the three tools. This explains
> what is portable, what is tool-specific, and how to keep **maker ≠ checker**
> (ADR-0003) intact in each.

## The portable core

**`AGENTS.md` is read natively by Claude Code, Cursor, and Codex.** It carries the
stack, module conventions, correctness rules, the loop description, the skill
pointers, and the session-handoff rule. So **the rules and the workflow apply in
every tool with zero extra setup.** Specs (`openspec/`), requirements, ADRs,
`DESIGN.md`, `CHECKLIST.md`, and `scripts/check-traceability.mjs` are plain files
that every tool reads. The git hooks and CI are tool-agnostic (pure git + Node).

Skills are referenced **by path** in AGENTS.md, so they work everywhere without a
tool-specific skill registry: `hryvnia-frontend-design`, `hryvnia-design`, and
`vercel-react-best-practices` under `.agents/skills/` (and `docs/design-system/`).

## What is tool-specific — and its mirror

The only Claude-Code-specific pieces are **subagents** and **slash commands**.
They are mirrored so the same loop is invocable in each tool:

| Role / command | Claude Code | Cursor | Codex |
|---|---|---|---|
| Propose a slice | `/propose-slice` (`.claude/commands/`) | `/propose-slice` (`.cursor/commands/`) | `/propose-slice` (`.codex/prompts/`) |
| Review a slice | `/review-slice` | `/review-slice` | `/review-slice` |
| Maker role | `kurs-maker` subagent (`.claude/agents/`) | `/kurs-maker` command | `/kurs-maker` prompt |
| Checker #1 | `kurs-reviewer` subagent | `/kurs-reviewer` command | `/kurs-reviewer` prompt |
| Checker #2 | `kurs-eval-judge` subagent | `/kurs-eval-judge` command | `/kurs-eval-judge` prompt |

**Single source of truth:** the canonical role/command text lives in `.claude/`.
The Cursor and Codex mirrors are thin redirectors that say "follow the canonical
`.claude/...` file", so there is no divergence to maintain.

## Keeping maker ≠ checker in each tool

- **Claude Code** dispatches `kurs-reviewer` / `kurs-eval-judge` as **separate
  subagents** with their own context — independence is automatic.
- **Cursor / Codex** have no auto-dispatched subagents, so run each checker in a
  **fresh chat/session**, separate from the one that built the slice. Same
  independence, achieved by a clean context. The `/review-slice` mirror reminds you
  to do this.

## Per-tool quick start

- **Claude Code:** `/propose-slice converter` → run `kurs-maker` → `/review-slice converter`.
- **Cursor:** open the command palette → `/propose-slice` (name the capability) →
  `/kurs-maker` → then a **new chat** → `/review-slice` (runs the two checkers).
  `.cursor/rules/hryvnia.mdc` keeps AGENTS.md in context.
- **Codex:** `/propose-slice` → `/kurs-maker` → new session → `/review-slice`.
  Codex reads `AGENTS.md` automatically.

## What does NOT need porting

The gates run identically everywhere — they are commands, not tool features:

```bash
npm run verify        # lint + check:trace + spec:validate + build
git commit            # .githooks/{pre-commit,commit-msg} fire regardless of tool
```
