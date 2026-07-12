# Capability: `shell`

[← Capability map](../capability.md) · **Depends on:** — · **Unblocks:** [supplier-profile](supplier-profile.md), [client-directory](client-directory.md), [form-input](form-input.md)

| Field | Value |
| --- | --- |
| Slice | S0 — Foundation |
| Order | #1 |
| Owner | ui |
| Gate status | shipped |
| OpenSpec spec | [shell/spec.md](../../openspec/specs/shell/spec.md) |
| OpenSpec change | `add-shell` |

## Purpose

App shell: landing page, dashboard navigation, responsive layout, health probe.
No invoice domain logic here — only routes and layout that later capabilities plug into.

## Requirements

| ID | Description | Status |
| --- | --- | --- |
| FR-SHELL-01 | Landing + dashboard nav to invoice creation, list, clients, settings | shipped |
| FR-SHELL-02 | Layout adapts at 768 px; preview area readable on mobile | shipped |
| FR-SHELL-03 | `GET /api/health` → `{ status: "ok", service: "invoice-maker" }` | shipped |

| Related | ID |
| --- | --- |
| NFR | NFR-PERF-01, NFR-DX-01, NFR-I18N-01 |
| TC | TC-STACK-01, TC-STACK-02, TC-DEPLOY-01 |
| BC | BC-LEGAL-02 (disclaimer in UI) |

## Implementation scope

| Area | Planned path |
| --- | --- |
| Landing | `src/app/page.tsx` |
| Dashboard shell | `src/app/(dashboard)/layout.tsx`, `src/components/layout/app-sidebar.tsx` |
| Routes | `dashboard/`, `invoices/`, `clients/`, `settings/` |
| Health | `src/app/api/health/route.ts` |
| i18n | Ukrainian UI strings in components |

## Verification

- [x] Navigate landing → dashboard without auth
- [x] All sidebar links resolve
- [x] `curl /api/health` returns 200 + JSON
- [x] Viewport 375 px: no horizontal overflow on shell
- [x] `npm run build` < 60 s (NFR-PERF-01)

## Done when

- Landing page and dashboard navigation exist
- Health endpoint returns ok
- Responsive shell at 768 px breakpoint

## After shipping

Update `shell: status: shipped` in `capability-map.yaml` → unlocks **S2** directory capabilities.
