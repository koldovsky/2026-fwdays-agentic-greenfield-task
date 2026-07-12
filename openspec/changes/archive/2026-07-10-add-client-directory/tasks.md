# Tasks: add-client-directory

> Lane D — do not edit settings/supplier files or `src/types/supplier.ts`.

## 1. Preflight

- [x] 1.1 Run `npm run capability:check -- --capability client-directory` and confirm unblocked (shell shipped)
- [x] 1.2 Invoke `.agents/skills/weg3d-fin-design` skill (post the 🎨 session banner) before touching UI files

## 2. Types and storage

- [x] 2.1 Extend `src/types/client.ts`: add `phone`, `website`; keep optional `company`, `taxId`; align with template placeholders (design D2). Verify: `npm run typecheck`
- [x] 2.2 Create `src/lib/storage/clients.ts`: versioned localStorage key (`invoice-maker:clients:v1`), list/get/save/delete, SSR guards, try/catch (design D1). Verify: `npm run typecheck && npm run lint`
- [x] 2.3 Export `clientToInvoiceCustomerFields()` helper for future `form-input` (design D3). Verify: `npm run typecheck`
- [x] 2.4 Create `src/lib/storage/clients.test.ts`: CRUD, sort by `updatedAt` desc, required-field validation. Verify: `npm run test`

## 3. UI components

- [x] 3.1 Create `src/components/clients/client-form.tsx`: name, company (optional), address, email, phone, website; `h-9` inputs, `wf-label`, Ukrainian labels. Verify: `npm run typecheck`
- [x] 3.2 Create `src/components/clients/clients-page-content.tsx` (client): searchable list (`Table` or cards), create/edit `Dialog`, delete `AlertDialog`, empty state. Verify: `npm run typecheck`

## 4. Clients page

- [x] 4.1 Update `src/app/(dashboard)/clients/page.tsx` to render `ClientsPageContent`; keep existing header copy. Verify: manual CRUD at `/clients`
- [x] 4.2 Manual check: create client, reload browser — data persists (TC-DATA-01)

## 5. Verification and handoff

- [x] 5.1 Full gate: `npm run test && npm run typecheck && npm run lint && npm run build` green
- [x] 5.2 Walk `docs/capabilities/client-directory.md` verification checklist (CRUD only; picker deferred)
- [x] 5.3 Run `openspec validate add-client-directory --strict`
- [x] 5.4 After verification: `/opsx:sync` → `capability-map.yaml` `client-directory: shipped`, update `docs/current-state.md`
