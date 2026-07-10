# Specs (Spec-Driven Development)

Each meaningful feature starts as a short spec **before** code. This is where functional (FR)
and non-functional (NFR) requirements live, plus the acceptance checks that define "done".

## Flow

1. Copy [`TEMPLATE.md`](TEMPLATE.md) to `NNN-short-name.md` (e.g. `001-user-notes.md`).
2. Fill in the problem, FRs, NFRs, and acceptance checks. Keep it small.
3. Implement to the spec, driving the `scripts/verify.*` loop.
4. Link the spec from the PR. Update it if reality diverges.

Specs are living documents and double as evidence of the engineering process.
