## 1. Services catalog store

- [x] 1.1 Add `lib/services-catalog`: reuse `ServiceLine`; `getServicesCatalogPath()` under `{data-root}/jobs/services.json`; `readServicesCatalog`, `writeServicesCatalog`, `upsertServicesIntoCatalog` (by trimmed `sign-name`)
- [x] 1.2 Validate catalog/line fields on write (`sign-name` / `service-name` non-empty; finite `amount` > 0 and `price` ≥ 0 when present on document lines); missing file reads as `[]`
- [x] 1.3 Unit tests: write creates `jobs/services.json`; upsert same `sign-name` overwrites; two distinct services persist; empty/invalid rejected

## 2. Services API

- [x] 2.1 Add `GET/PUT /api/jobs/services` calling the store (GET → array; PUT → full validated array replace)
- [x] 2.2 Map validation / persistence errors to clear 4xx/5xx; never claim success on failed write (NFR-10)

## 3. Step 5 UI

- [x] 3.1 Create `ServicesStep` client component: catalog pick, editable rows (`sign-name`, `service-name`, `amount`, `price`), «додати ще» / remove when >1 row; Ukrainian labels; pre-fill from session `services` when non-empty
- [x] 3.2 On «Далі»: validate ≥1 line → merge/upsert into catalog via PUT → `PATCH` session `services` + advance `current-step` to 6; block on invalid lines or any failed save
- [x] 3.3 Wire into `WizardShell`: render services UI on step 5; keep stubs for steps 6–7

## 4. Verification & handoff

- [x] 4.1 Verify TC-14 (two services in document + catalog fields), plus reload/Back restores `services` without new `guid`
- [x] 4.2 Update `docs/current-state.md` with services-catalog status and next capability (`template-fill`)
