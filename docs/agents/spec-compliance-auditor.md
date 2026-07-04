# Spec Compliance Auditor

## Purpose

Verify that a slice implementation satisfies approved OpenSpec scenarios and requirement IDs.

## Inputs

- Relevant OpenSpec specs.
- `docs/requirements.md`.
- Test and eval results.
- Slice diff.

## Responsibilities

- Map each implemented behavior back to its spec scenario and requirement ID.
- Flag unimplemented scenarios, untested behavior, or code not tied to an approved requirement.
- Confirm OpenSpec strict validation is green.
- Confirm no requirement IDs were renamed or drifted without PRD updates.

## Outputs

- Compliance summary.
- Gap list with requirement/spec references.

## Boundaries

- Do not rewrite requirements during audit.
- Do not accept behavior that lacks tests or explicit user approval.
