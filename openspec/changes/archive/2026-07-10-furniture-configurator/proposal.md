## Why

A furniture factory's real-world configuration process (colors, materials, sizes typed as free text into 1C) produces duplicate "products" from typos and inconsistent naming (e.g. "кашемір" vs "кишемір"). This project builds a small demo that solves the standardization piece of that problem: a controlled-vocabulary configurator that validates a product's parts and sizes and emits a clean bill of materials (BOM), instead of relying on free-text entry. Full scope (approved in `docs/superpowers/specs/2026-07-10-furniture-configurator-design.md`) covers only this one slice — not 1C sync, physical inventory tracking, order automation, or analytics.

## What Changes

- Add a dictionary management capability: admin-managed controlled lists for colors, materials, hardware items, and standard sizes, plus per-part-role size rules (standard sizes and custom-size ranges).
- Add a product configuration capability: manager selects parts (top/bottom/facade/corpus/hardware) for a single product type (nightstand-like), sizes are validated against the dictionary/rules, and a BOM is generated only when the selection is valid.
- Add a catalog matching capability: the generated selection is compared against existing standard catalog entries by dictionary IDs (not free text) to flag whether it's a known standard batch or a new individual combination, with the option to save a new combination as a standard catalog entry.
- Add a simple role-based access capability: hardcoded login (manager/admin) gating which screens are available — not a real auth system.

## Capabilities

### New Capabilities
- `dictionary-management`: CRUD for colors, materials, hardware items, standard sizes, and part-size rules (admin role).
- `product-configuration`: part selection, size validation (standard vs. custom-in-range), and BOM generation for a single product type (manager role).
- `catalog-matching`: comparing a configuration against existing standard catalog entries by dictionary ID and saving new standard entries.
- `role-access`: hardcoded manager/admin login gating UI screens.

### Modified Capabilities
(none — greenfield project, no existing specs)

## Impact

- New Next.js (App Router) + TypeScript application, Prisma ORM + SQLite for persistence.
- New domain logic modules (`lib/configurator/*`) implementing validation, BOM generation, and catalog matching as pure, framework-independent functions with unit tests.
- New UI: manager configurator flow, admin dictionary CRUD screens, login screen.
- No existing code or systems affected (new project).
