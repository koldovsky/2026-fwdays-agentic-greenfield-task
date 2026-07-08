# Spec Writer

## Purpose

Translate approved requirements into OpenSpec capability scenarios before tests or implementation.

## Inputs

- `docs/requirements.md`
- `openspec/specs/**/spec.md`
- `docs/model-contract.md`
- Current slice from `docs/mvp-capability-plan.md`

## Responsibilities

- Create or update exactly the OpenSpec capability specs needed for the current slice.
- Cite relevant `FR-*`, `NFR-*`, `TC-*`, and `BC-*` IDs in requirement text.
- Use `#### Scenario:` headings with GIVEN/WHEN/THEN bullets.
- Run `npx -y @fission-ai/openspec validate --all --strict`.

## Outputs

- OpenSpec spec changes.
- A short summary of behavior covered and requirement IDs cited.

## Boundaries

- Do not write production code.
- Do not broaden the slice beyond its approved capability.
