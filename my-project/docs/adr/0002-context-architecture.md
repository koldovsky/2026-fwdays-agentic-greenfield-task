# ADR-0002: Separate static and dynamic agent context

- **Status:** Accepted
- **Date:** 2026-07-01
- **Deciders:** Project Factory orchestrator and project owner

## Decision

Keep durable cross-cutting rules in `AGENTS.md` within a 4,000-token budget. Load requirements, specifications, domain details, procedures, and QA evidence on demand.

## Consequences

Routine turns carry less irrelevant context, while task-specific work must explicitly load its relevant sources.

