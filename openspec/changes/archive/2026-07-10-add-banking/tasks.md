# Tasks: add-banking

## 1. Types

- [x] 1.1 Extract `export type Currency = "USD" | "EUR"` in
  `src/types/invoice.ts` and reuse it in `Invoice.currency`
  (verify: `npm run typecheck`)

## 2. Banking module

- [x] 2.1 Create `src/lib/banking/supplier-block.ts` with
  `MissingIbanError` (carries `currency`; Ukrainian BC-UX-01 message) and
  `selectIban(profile, currency)` per FR-BANK-01 (trims; blank → error)
- [x] 2.2 Add `SUPPLIER_BLOCK_KEYS` tuple, `SupplierBlockKey` union,
  `SupplierBlockVars` type, and `buildSupplierBlock(profile, currency)`
  per FR-BANK-03 (all eight `SUPPLIER_*` keys, trimmed values,
  `SUPPLIER_IBAN` via `selectIban`)

## 3. Tests

- [x] 3.1 `src/lib/banking/supplier-block.test.ts`: USD → `ibanUsd`,
  EUR → `ibanEur`, missing/blank IBAN throws `MissingIbanError` naming the
  currency (both currencies), supplier block contains exactly the eight keys
  with profile values (verify: `npx vitest run src/lib/banking`)
- [x] 3.2 Contract test: every `SUPPLIER_*` placeholder parsed from
  `docs/invoice-template.html` is present in `SUPPLIER_BLOCK_KEYS`
  (guards against template drift)

## 4. Ship

- [x] 4.1 Full gates: `npm run typecheck && npm run lint && npm run build`
  and `npx vitest run` all green
- [x] 4.2 Flip `banking: shipped` in `openspec/capability-map.yaml`; update
  `docs/capability.md` §0/S2/S3 rows and `docs/capabilities/banking.md`
  status; verify `npm run capability:check -- --capability document-render`
  reports OK
- [x] 4.3 Sync delta spec into `openspec/specs/banking/spec.md`
  (`openspec validate --strict` passes) — via `/opsx:sync` before archive
