# Capability: `nace-catalog`

[← Capability map](../capability.md) · **Depends on:** — · **Unblocks:** [document-render](document-render.md), [form-input](form-input.md)

| Field | Value |
| --- | --- |
| Slice | S1 — Domain core |
| Order | #2a (parallel with invoice-calc) |
| Owner | domain |
| Gate status | **shipped** |
| OpenSpec spec | [nace-catalog/spec.md](../../openspec/specs/nace-catalog/spec.md) |
| OpenSpec change | `add-nace-catalog` (synced; archive pending) |

## Purpose

Typed NACE 2.1-UA seed catalog and keyword matcher for service line text.
Pure `src/lib/` module — no React, no storage. Replaces legacy KVED.

## Requirements

| ID | Description | Status |
| --- | --- | --- |
| FR-NACE-01 | Entries keyed by stable id; NACE class `XX.XX` (non-unique) | shipped |
| FR-NACE-02 | 74.12 graphic design bilingual lines | shipped |
| FR-NACE-03 | 74.12 / 74.14 3D visualization lines | shipped |
| FR-NACE-04 | 59.12 post-production lines | shipped |
| FR-NACE-05 | Keyword matcher + `matched` / `ambiguous` / `none` | shipped |
| BC-NACE-01 | No KVED DK 009:2010 in new docs/UI | shipped |

> **Dropped:** `FR-NACE-06` (NACE code on printed invoice) — no legal requisite;
> frozen template has no placeholder (Wayfinder ticket 03, 2026-07-09).

Seed data reference: `docs/191_2025.pdf`, table in [requirements.md](../requirements.md).

## Implementation scope

| Area | Path |
| --- | --- |
| Catalog data | `src/lib/nace/catalog.ts` |
| Matcher | `src/lib/nace/match.ts` |
| Types | `src/lib/nace/types.ts` |
| Tests | `src/lib/nace/*.test.ts` (TC-STACK-06) |

## Verification

- [x] Matcher returns best entry for known keywords
- [x] Ambiguous input returns `ambiguous` (not silent wrong pick)
- [x] Vitest passes for all seed entries (104 tests total in suite)
- [x] No KVED strings in catalog line texts

## Done when

- Typed seed catalog in `src/lib/nace/`
- Keyword matcher with clarifying fallback
- Vitest coverage for matcher

## After shipping

Unlocks **document-render** (service row text) and **form-input** (service picker).
