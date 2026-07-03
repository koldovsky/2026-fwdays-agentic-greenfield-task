# Capabilities

Decomposition of [`requirements.md`](requirements.md) into OpenSpec capabilities —
cohesive, independently-specifiable slices. Each maps back to requirement IDs
(`FR-*`, `NFR-*`, `TC-*`, `BC-*`) so work stays traceable.

> **Note on status:** the `shipped` values in `requirements.md` describe the
> reference HTML prototype (`template/prototype.html`), not the Next.js app. The
> app is a bare scaffold, so for us **every MVP capability below is greenfield.**

Per-capability detail lives in [`capabilities/`](capabilities/).

---

## MVP capabilities

| # | Capability | Requirements | Constraints |
|---|---|---|---|
| 1 | [`program-data`](capabilities/program-data.md) | §10 datasets | TC-DATA-01, BC-HONESTY-01 (freshness) |
| 2 | [`app-shell`](capabilities/app-shell.md) | — | NFR-RESP-01, NFR-A11Y-01, BC-LANG-01, TC-STACK-01, TC-PLATFORM-01, BC-DEADLINE-01 |
| 3 | [`scoring-engine`](capabilities/scoring-engine.md) | FR-SCORE-01, FR-SCORE-02, FR-SCORE-03 | §6, NFR-PERF-01, BC-HONESTY-01 |
| 4 | [`state-persistence`](capabilities/state-persistence.md) | FR-STATE-01 | TC-STORAGE-01, NFR-PRIV-01, BC-PRIVACY-01 |
| 5 | [`score-input`](capabilities/score-input.md) | FR-INPUT-01, FR-INPUT-02, FR-INPUT-03 | — |
| 6 | [`recommendations`](capabilities/recommendations.md) | FR-SCORE-02, FR-SCORE-03, FR-UX-01 | BC-HONESTY-01 |
| 7 | [`filtering`](capabilities/filtering.md) | FR-FILTER-01, FR-FILTER-02, FR-UX-01 | — |
| 8 | [`program-detail`](capabilities/program-detail.md) | FR-DETAIL-01 | BC-HONESTY-01 |
| 9 | [`comparison`](capabilities/comparison.md) | FR-COMPARE-01 | — |
| 10 | [`shortlist`](capabilities/shortlist.md) | FR-LIST-01, FR-LIST-02, FR-UX-01 | — |

## Deferred capabilities (Phase 3 — `proposed` / `could`)

Not spec'd for MVP; listed so scope stays explicit.

| Capability | Requirements | Why deferred |
|---|---|---|
| `program-search` | FR-SEARCH-01 | `could`; Phase 3 |
| `deadline-reminders` | FR-LIST-03, BC-DEADLINE-01 (active reminders) | `could`/`proposed`; passive deadline surfacing lives in `app-shell` |
| `cross-device-sync` | NFR-SYNC-01 | `proposed`; needs accounts/backend, breaks TC-STORAGE-01 (local-only MVP) |

---

## Dependency graph

```
program-data ─┬─→ scoring-engine ─┬─→ recommendations ─→ filtering
              │                   ├─→ program-detail
              │                   └─→ comparison
              └─→ score-input ────┘         ↑
app-shell (foundation for all UI)           │
state-persistence ──→ score-input, shortlist┘
recommendations ──→ shortlist
```

## Build order

The critical path to a demoable "enter scores → see chances" flow is
**program-data → scoring-engine → score-input → recommendations**.

**Wave 0 — foundations** (no feature deps; #1 and #2 can run in parallel)
1. `program-data` — nothing computes without the dataset shape.
2. `app-shell` — design system + Ukrainian locale + responsive base that every UI slice inherits.

**Wave 1 — engine + I/O**
3. `scoring-engine` — pure domain logic, independently testable.
4. `state-persistence` — thin storage layer; unblocks #5 and #10.
5. `score-input` — needs data (#1) and persistence (#4).

**Wave 2 — primary flow** (delivers US-1, US-2, US-3)
6. `recommendations` — first end-to-end value.
7. `filtering` — refines the list once it exists.

**Wave 3 — deep-dive + personal** (parallelizable once Wave 2 lands)
8. `program-detail`
9. `comparison`
10. `shortlist`
