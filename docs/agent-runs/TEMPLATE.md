<!--
Copy this file to docs/agent-runs/NNN-<slice>-<role>.md and fill every section.
Delete these HTML comments. Keep it terse: link and cite path:line, do not paste
large code dumps. See docs/agent-runs/README.md for the naming convention.
-->

# NNN - <slice> - <role>

## Run

- **Date:** YYYY-MM-DD HH:MM (Europe/Kyiv)
- **Slice:** <NNN-name, or "infra" if no numbered slice owns this>
- **Role:** <test-engineer | implementer | code-review | security-review | judge | audit | ...>
- **Branch:** <git branch>
- **Commits:** <short shas produced by this run, or "(none — read-only)">

## Objective

<!-- One or two sentences: what this session was asked to do. -->

## What was done

<!-- Bulleted, factual. Changes made (path:line), files added, decisions taken.
     For a read-only run, what was inspected. -->

## Verification

<!-- The commands you actually ran and their REAL output (exit status for each).
     Never "looks good". If a check was not run, say so and why. -->

```
$ <command>
<real output>
EXIT=<code>
```

## Findings

<!-- Tag each [BLOCKING] or [MINOR] with a path:line anchor and a concrete
     failure/impact scenario. "None." is a valid, honest answer. -->

- `[BLOCKING] path:line` — <defect + how it fails>
- `[MINOR] path:line` — <issue + impact>

## Verdict

<!-- One of: DONE / NOT DONE / open. Say against which bar (spec acceptance
     checks, Definition of Done). If NOT DONE, name exactly what remains. -->

## What was NOT done / follow-ups

<!-- Stated plainly — no silent skips. What you did not do, could not verify,
     or deferred, and any accepted non-blocking follow-ups. -->
