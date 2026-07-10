## Context

This project is a course homework demo (fwdays "Agentic Engineering: Greenfield") derived from a real furniture-factory problem: three unsynchronized 1C databases, free-text attribute entry causing duplicate products (e.g. "кашемір" vs "кишемір"), and a fully manual branch-to-factory ordering process. The full problem spans multiple independent subsystems (BOM/configuration, 1C sync, physical stock/status tracking, department-specific access, KPI analytics, order automation). This change implements only one slice: a product configurator with a standardized dictionary and BOM generation, validated against the full design in `docs/superpowers/specs/2026-07-10-furniture-configurator-design.md`.

## Goals / Non-Goals

**Goals:**
- Eliminate free-text duplicate attributes by making color/material/hardware/size selection always reference a controlled dictionary (by ID).
- Validate part sizes (standard vs. custom-in-range) before allowing BOM generation.
- Detect whether a configured combination matches an existing standard catalog entry (by dictionary IDs) vs. is a new individual combination.
- Keep the validation/BOM/matching logic as pure, framework-independent functions that are unit-testable in isolation.

**Non-Goals:**
- Syncing or replacing the factory's 1C databases.
- Tracking physical product state (production/warehouse/in-transit/branch/sold).
- Automating the branch-to-factory order email workflow.
- Sales/production analytics or KPI dashboards for top management.
- Supporting multi-part products like kitchens (cabinets, shelves, drawers) — only a single nightstand-like product type.
- Real authentication — login is a hardcoded manager/admin stub.
- Stock/inventory availability checks.

## Decisions

**Single Next.js app with isolated domain logic (chosen) vs. separate rules-engine service vs. config-driven JSON rules.**
A separate service or JSON-driven rule schema adds infrastructure/abstraction that isn't justified for one product type — it violates YAGNI for a scoped homework demo. A single Next.js + Prisma + SQLite app keeps the full engineering cycle (spec → tests → implementation) achievable in the available time, while still isolating `lib/configurator/*` as pure TypeScript functions with no framework/DB dependency, so validation, BOM generation, and catalog matching are independently unit-tested.

**Matching by dictionary ID, not free text.**
`findMatchingCatalogEntry` compares a configuration to existing `CatalogEntry` rows using foreign-key IDs (color, material, size) rather than string values. This structurally prevents the "кашемір"/"кишемір" duplicate problem: the same dictionary row is always the same ID, and typos can't create a second entry because there's no free-text field to type into in the first place.

**Size validation: standard list OR custom range, not free-form.**
Each `PartSpec` (per part role: top/bottom/facade/corpus) declares whether custom sizes are allowed and, if so, a `minCm`/`maxCm` range. This keeps individual orders possible (the real factory does support custom sizes) while still bounding what "custom" can mean, so invalid or nonsensical sizes are rejected before a BOM is produced.

**Hardcoded manager/admin login instead of real auth.**
A full auth system is out of scope for a demo whose purpose is the configurator/dictionary logic, not identity management. A simple login form with two fixed users is sufficient to demonstrate the two UI surfaces (manager configurator vs. admin dictionary CRUD).

## Risks / Trade-offs

- **SQLite is not production-grade** → Mitigation: acceptable for a demo; the domain logic layer is DB-agnostic, so swapping to Postgres later is a config change, not a rewrite.
- **Hardcoded login is not secure** → Mitigation: explicitly out of scope and documented as a stub; never used for real data.
- **Only one product type (nightstand-like) is supported** → Mitigation: `ProductType`/`PartSpec` are modeled as first-class entities so adding a second product type later doesn't require a schema rewrite, even though this change only populates one.
- **No persisted `ConfigurationRequest` history in MVP** → Mitigation: BOM/validation results are computed on demand; if audit history becomes a requirement later, the pure domain functions can be wrapped with persistence without changing their signatures.

## Migration Plan

Greenfield project — no existing system to migrate from or roll back to. Deployment is local (`next dev` / `next start`) for the purposes of the course demo video; no production rollout planned.

## Open Questions

None outstanding — decisions above were confirmed during brainstorming (see `docs/superpowers/specs/2026-07-10-furniture-configurator-design.md`).
