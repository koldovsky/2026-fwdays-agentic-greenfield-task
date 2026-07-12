# CLAUDE.md

Claude Code repo orientation.

## Read AGENTS.md first

`AGENTS.md`: sole agent behavior source. Read at session start. Keep workflow rules there.

`CLAUDE.md`: project purpose, state, structure only. Conflict: `AGENTS.md` wins. Never duplicate behavior rules here.

Roles: `AGENTS.md` rules; `TODO.md` next work + priorities; `STATUS.md` recent work.

## Repository state

Greenfield. No product code. Directory skeleton, agent rules, review config only.
No `package.json`, build system, linter, tests. Stack undecided. Agent constraints: `AGENTS.md` section "Stack".

## Project

**fwdays Academy · Agentic Engineering: Greenfield** homework. Graded on process evidence—context engineering, loops, verification, maker ≠ checker—not code volume.

Product: agentic **transcript-to-GitBook pipeline**. Raw networking lesson transcript becomes structured Markdown article + linked Markdown glossary cards with Ukrainian Wikipedia refs.

Human orchestrator stays in loop: agents prep; human reviews, approves, publishes. Constraints: `AGENTS.md` section "Human in the loop".

Bilingual product description: `README.md`. Preserved assignment: `docs/course-assignment.md`. Original templates: ignored `original_templates_STASH/`.

## Data flow

```text
input/transcripts/   raw transcripts
        ↓
output/articles/     structured Markdown articles
output/glossary/     glossary cards, one term per card
```

Directories empty except `.gitkeep`. Term-extraction/card-format requirements absent; define in OpenSpec before implementation.

## OpenSpec-based SDD

Specification-Driven Development required. Mandatory order and scope: `AGENTS.md` section "Spec-driven development".

## Review and submission

CodeRabbit (`.coderabbit.yaml`): Ukrainian course-mentor PR review; `assertive`; advisory, no merge block. Evidence targets:

1. real author name;
2. 1–2 minute demo link;
3. concrete Agentic Engineering practices: context engineering, loops, maker ≠ checker, specs, tests/evals, tools/MCP, human decisions, agent work;
4. finished result.

Template: `.github/pull_request_template.md`. Completion/artifact rules: `AGENTS.md` section "PR / deliverables".