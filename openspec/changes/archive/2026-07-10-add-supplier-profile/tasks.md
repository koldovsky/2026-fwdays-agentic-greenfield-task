# Tasks: add-supplier-profile

> Lane C — do not edit `src/app/(dashboard)/clients/` or `src/types/client.ts`.

## 1. Preflight

- [x] 1.1 Run `npm run capability:check -- --capability supplier-profile` and confirm unblocked (shell shipped)
- [x] 1.2 Invoke `.agents/skills/weg3d-fin-design` skill (post the 🎨 session banner) before touching UI files

## 2. Types and storage

- [x] 2.1 Create `src/types/supplier.ts` with `SupplierProfile` (FR-BANK-02 fields, `label`, timestamps). Verify: `npm run typecheck`
- [x] 2.2 Create `src/lib/storage/supplier-profiles.ts`: versioned localStorage envelope (`invoice-maker:supplier-profiles:v1`), CRUD + `getActive`/`setActive`, SSR guards, try/catch (design D1–D3). Verify: `npm run typecheck && npm run lint`
- [x] 2.3 Create `src/lib/storage/supplier-profiles.test.ts`: save/list/edit/delete, active pointer, delete-active fallback, reload simulation via storage mock. Verify: `npm run test`

## 3. UI components

- [x] 3.1 Create `src/components/supplier/supplier-profile-form.tsx`: bilingual name/address, tax ID, bank, SWIFT, USD/EUR IBAN fields; `h-9` inputs, `wf-label`, Ukrainian labels; validation for required fields. Verify: `npm run typecheck`
- [x] 3.2 Create `src/components/supplier/supplier-profile-dropdown.tsx`: lists profiles from storage, emits active selection. Verify: `npm run typecheck`
- [x] 3.3 Create `src/components/supplier/supplier-settings-panel.tsx` (client): wire dropdown + form + delete `AlertDialog`; mount from settings page. Verify: `npm run typecheck`

## 4. Settings page

- [x] 4.1 Update `src/app/(dashboard)/settings/page.tsx` to render `SupplierSettingsPanel`; keep existing `wf-display` header copy. Verify: manual CRUD at `/settings`
- [x] 4.2 Manual check: create two profiles, switch active, reload browser — data persists (TC-DATA-01)

## 5. Security verification

- [x] 5.1 Confirm no real tax IDs or IBANs in source defaults; after `npm run build`, grep `.next/static` for committed secrets (NFR-SEC-01). Verify: no matches for production literals

## 6. Verification and handoff

- [x] 6.1 Full gate: `npm run test && npm run typecheck && npm run lint && npm run build` green
- [x] 6.2 Walk `docs/capabilities/supplier-profile.md` verification checklist
- [x] 6.3 Run `openspec validate add-supplier-profile --strict`
- [x] 6.4 After verification: `/opsx:sync` → `docs/requirements.md` FR-BANK-02 → `shipped`, `capability-map.yaml` `supplier-profile: shipped`, update `docs/current-state.md`
