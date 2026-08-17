## 1. Test harness

- [x] 1.1 Add a unit-test runner (prefer Vitest, or Node `node:test` if avoiding deps) and a `test` script in `package.json`
- [x] 1.2 Create `lib/locale-helpers.test.ts` with failing TC-22 / TC-23 assertions as the acceptance target

## 2. Amount helper

- [x] 2.1 Implement `amountToCursive(n: number): string` in `lib/locale-helpers.ts` (port logic from `helpers/chislo-propisom.js`, fix apostrophes to `'`, capitalize first letter, гривня/копійки declension)
- [x] 2.2 Make TC-22 pass: `8750` → `Вісім тисяч сімсот п'ятдесят гривень 00 копійок`
- [x] 2.3 Add supporting amount cases (e.g. `0`, `1`/`2` gender for гривня, one fractional amount) and ensure they pass

## 3. Date helpers

- [x] 3.1 Implement `dateToNumeric(d: Date | string): string` → `DD.MM.YYYY`
- [x] 3.2 Implement `dateToCursive(d: Date | string): string` with Ukrainian genitive months and ` р.` suffix
- [x] 3.3 Make TC-23 pass for input `15.05.2021`: numeric `15.05.2021`, cursive `15 травня 2021 р.`

## 4. Cleanup and verify

- [x] 4.1 Export named functions from `lib/locale-helpers.ts` so they are importable by future `template-fill`
- [x] 4.2 Remove or leave unreferenced `helpers/chislo-propisom.js` (do not call it from the new module)
- [x] 4.3 Run the full helper test suite and confirm all locale-helpers scenarios pass
