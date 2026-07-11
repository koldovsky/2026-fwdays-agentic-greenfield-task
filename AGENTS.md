# jarsplit — agent context

- Product brief (narrative context): @docs/product-brief.md
- Product requirements (single source of truth, requirement IDs): @docs/product-requirements.md
- Current state (last action taken, timestamp): @docs/current-state.md — after
  completing a unit of work, update this file with what was done and an
  ISO-8601 timestamp, so the next agent or human knows what happened last.
- Business-rule changes (matching, link generation, validation, security)
  apply to **both** the Go CLI (`internal/`) and Android (`domain/`, `data/`) —
  no shared code, so keep them in sync by hand.
