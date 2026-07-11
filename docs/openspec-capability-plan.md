# `jarsplit` — OpenSpec capability plan

This document bridges [product-requirements.md](product-requirements.md) (the
requirement-level source of truth) and OpenSpec (the mechanism we'll use to
implement it). It groups the PRD's 38 requirement IDs into **capabilities** —
OpenSpec's unit of spec organization, each eventually living at
`openspec/specs/<capability>/spec.md` — and gives a dependency-ordered sequence
for building them.

This is a planning artifact, not an OpenSpec change itself. Nothing here is
implemented yet; `openspec/specs/` and `openspec/changes/` are still empty.

## Capability map

| # | Capability | Purpose | Requirement IDs owned | Depends on |
| - | ---------- | ------- | ---------------------- | ---------- |
| 1 | `plan-parsing` | Parse `plan.txt` into validated `(name, amount)` entries. Pure function over text — no I/O beyond reading the file. | FR-INPUT-01, FR-INPUT-02, FR-PARSE-01, FR-PARSE-02, FR-AMOUNT-01, FR-MALFORMED-01, FR-DUP-01 | none |
| 2 | `mono-client` | Fetch `client-info` from the monobank API (or a fixture override) and expose `jars[]`. Owns auth, transport, and the one-call-per-run error taxonomy. | FR-RESOLVE-01, FR-API-01, FR-FAIL-02, TC-API-01, TC-SCHEMA-01, NFR-SEC-01, NFR-SEC-02, NFR-SEC-03, NFR-NET-01, NFR-TEST-01 | none |
| 3 | `jar-matching` | Match parsed plan entries against fetched jars: exact case-insensitive match, currency filter, ambiguity/unknown detection. | FR-RESOLVE-02, FR-RESOLVE-03, FR-RESOLVE-04, FR-CURRENCY-01 | `plan-parsing`, `mono-client` |
| 4 | `link-generation` | Build `send.monobank.ua` links from matched `(sendId, amount)` pairs. | FR-LINK-01, NFR-SEC-04 | `jar-matching` |
| 5 | `output-reporting` | Render the stdout table + totals and the stderr warnings/totals for skipped jars. | FR-OUTPUT-01, FR-OUTPUT-02, FR-TOTAL-01, FR-TOTAL-02, FR-WARN-01 | `jar-matching`, `link-generation` |
| 6 | `cli-orchestration` | Wire argv → parse → resolve → match → link → report → exit code. Owns the parse-before-API-call ordering and the fatal-error/exit-code contract. | FR-FAIL-01, FR-EXIT-01, TC-MODULE-01, TC-LANG-01, TC-DEP-01 | all of the above |

## Cross-cutting constraints

These aren't standalone capabilities — they're properties enforced *inside*
one or more of the six above. Each is annotated with where it's primarily
enforced, so it doesn't get silently dropped during implementation:

| ID | Constraint | Primarily enforced in | Notes |
| -- | ---------- | ---------------------- | ----- |
| BC-SCOPE-01 | Personal jars only, own account, no tax/commission | `jar-matching` | Only `jars[]` is ever consulted (FR-RESOLVE-01 already excludes `accounts[]`); no FOP/business jar path exists to matching. |
| BC-SCOPE-02 | Fixed amounts only, no % or remainder splitting | `plan-parsing` | Enforced structurally — the grammar has no syntax for percentages. |
| BC-SAFE-01 | Never silently misroute money | `jar-matching` | Every non-match (unknown/ambiguous/duplicate/non-UAH/malformed) skips + warns rather than guessing; echoed outward by `output-reporting`'s warnings. |
| BC-PRIVACY-01 | No analytics/telemetry; plan and token never persisted | `mono-client` + `plan-parsing` | Token never touches disk (`mono-client`); plan is read once and not written back (`plan-parsing`). |
| NFR-DET-01 | Pure deterministic function of (plan, client-info response) | `cli-orchestration` | Composed from each capability's own determinism (stable plan order in `plan-parsing`, no randomness in `jar-matching`/`link-generation`); verified end-to-end only once orchestration exists. |

## Implementation order

```
Phase 1 (parallel, no shared dependencies)
  ┌────────────────┐   ┌────────────────┐
  │  plan-parsing   │   │  mono-client   │
  └────────┬────────┘   └────────┬───────┘
           │                     │
           └──────────┬──────────┘
                       ▼
Phase 2        ┌────────────────┐
               │  jar-matching   │
               └────────┬────────┘
                        ▼
Phase 3        ┌──────────────────┐
               │  link-generation  │   ◄── gated by V-1 before "shipped"
               └────────┬──────────┘
                        ▼
Phase 4        ┌──────────────────┐
               │ output-reporting  │
               └────────┬──────────┘
                        ▼
Phase 5        ┌──────────────────┐
               │ cli-orchestration │   ◄── integration: wires 1-5, owns exit codes
               └──────────────────┘
```

- **Phase 1 — `plan-parsing` and `mono-client` in parallel.** Neither depends
  on the other; both are pure/isolated and fully covered by
  `NFR-TEST-01`-style fixtures without touching the live API.
- **Phase 2 — `jar-matching`.** Needs real shapes from both Phase 1
  capabilities (parsed entries, fetched jars) before matching logic can be
  written against them.
- **Phase 3 — `link-generation`.** Small, but strictly downstream of matching
  since it consumes `(sendId, amount)` pairs. Carries the **V-1** runtime
  verification gate (confirm `?a=N` prefills `N ₴`, not kopiykas) — don't mark
  FR-LINK-01 `shipped` until that's checked against a real link.
- **Phase 4 — `output-reporting`.** Needs both the matched/skipped sets from
  `jar-matching` and the links from `link-generation` to render the table,
  totals, and warnings.
- **Phase 5 — `cli-orchestration`.** Last: integrates everything behind the
  `jarsplit` binary, enforces parse-before-API-call ordering (FR-FAIL-01) and
  the three-tier exit code contract (FR-EXIT-01).

## Mapping to OpenSpec mechanics

Each capability above becomes one OpenSpec change proposal — created via
`openspec new change "<name>"` or the `openspec-propose` skill — worked through
its own `proposal.md` / `design.md` / `tasks.md`, and archived once
implemented. Archiving syncs its delta spec into `openspec/specs/<capability>/spec.md`,
which becomes the durable, versioned capability spec.

Suggested change names, in build order:

1. `add-plan-parsing`
2. `add-mono-client`
3. `add-jar-matching`
4. `add-link-generation`
5. `add-output-reporting`
6. `add-cli-orchestration`

## Traceability appendix — every requirement ID, exactly once

### FR (22)

| ID | Capability |
| -- | ---------- |
| FR-INPUT-01 | plan-parsing |
| FR-INPUT-02 | plan-parsing |
| FR-PARSE-01 | plan-parsing |
| FR-PARSE-02 | plan-parsing |
| FR-AMOUNT-01 | plan-parsing |
| FR-MALFORMED-01 | plan-parsing |
| FR-DUP-01 | plan-parsing |
| FR-RESOLVE-01 | mono-client |
| FR-RESOLVE-02 | jar-matching |
| FR-RESOLVE-03 | jar-matching |
| FR-RESOLVE-04 | jar-matching |
| FR-CURRENCY-01 | jar-matching |
| FR-LINK-01 | link-generation |
| FR-OUTPUT-01 | output-reporting |
| FR-OUTPUT-02 | output-reporting |
| FR-TOTAL-01 | output-reporting |
| FR-TOTAL-02 | output-reporting |
| FR-WARN-01 | output-reporting |
| FR-FAIL-01 | cli-orchestration |
| FR-FAIL-02 | mono-client |
| FR-API-01 | mono-client |
| FR-EXIT-01 | cli-orchestration |

### NFR (7)

| ID | Capability |
| -- | ---------- |
| NFR-DET-01 | cli-orchestration (cross-cutting, see above) |
| NFR-SEC-01 | mono-client |
| NFR-SEC-02 | mono-client |
| NFR-SEC-03 | mono-client |
| NFR-SEC-04 | link-generation |
| NFR-NET-01 | mono-client |
| NFR-TEST-01 | mono-client |

### TC (5)

| ID | Capability |
| -- | ---------- |
| TC-LANG-01 | cli-orchestration |
| TC-DEP-01 | cli-orchestration |
| TC-MODULE-01 | cli-orchestration |
| TC-API-01 | mono-client |
| TC-SCHEMA-01 | mono-client |

### BC (4)

| ID | Capability |
| -- | ---------- |
| BC-SCOPE-01 | jar-matching (cross-cutting, see above) |
| BC-SCOPE-02 | plan-parsing (cross-cutting, see above) |
| BC-SAFE-01 | jar-matching (cross-cutting, see above) |
| BC-PRIVACY-01 | mono-client / plan-parsing (cross-cutting, see above) |

**Total: 38/38 requirement IDs accounted for, each exactly once.**
