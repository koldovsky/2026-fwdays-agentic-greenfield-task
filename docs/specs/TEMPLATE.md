# NNN — <feature name>

- **Status:** draft | approved | done
- **Owner:** <you>
- **Date:** <YYYY-MM-DD>

## Problem / goal

One or two sentences: what user need or outcome does this serve?

## Functional requirements (FR)

- FR1: The system shall …
- FR2: …

## Non-functional requirements (NFR)

- NFR1 (performance): e.g. p95 latency < 200 ms for endpoint X.
- NFR2 (security): e.g. only authenticated users may …
- NFR3 (reliability / observability / accessibility): …

## Out of scope

- …

## Design sketch

APIs, data model / migration, and UI touchpoints. Note anything that changes `AGENTS.md`.

## Acceptance checks (how we verify)

- [ ] Automated test(s) covering FR1…FRn (name them)
- [ ] `scripts/verify.*` green (lint, migrations, tests, frontend build)
- [ ] NFRs demonstrably met (how measured)
- [ ] Reviewed by a separate pass (`/code-review`, `/security-review`) + CodeRabbit
