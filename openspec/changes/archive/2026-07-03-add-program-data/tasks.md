## 1. Domain types (§10 data)

- [x] 1.1 Define `SubjectKey` (`ukr`/`math`/`hist`/`eng`), `REQUIRED_SUBJECTS` labels, and the `ElectiveSubject` union + `ELECTIVE_SUBJECTS` list in `app/lib/types.ts`
- [x] 1.2 Define `Coefficients` (partial record of `SubjectKey` → weight) and the `Program` interface with all §10 fields: `id`, `uni`, `spec`, `field`, `city`, `coeff`, `cutoffs` (2022/2023/2024), `budgetSeats`, `tuition`, `dorm`, `electives`
- [x] 1.3 Define the `Benefits` toggle shape (`village`/`quota`/`orphan`) consumed by `scoring-engine`

## 2. Program registry (TC-DATA-01)

- [x] 2.1 Author `PROGRAMS` in `app/lib/programs.ts` with exactly 11 sample programs, each fully populated and with unique ids
- [x] 2.2 Ensure every program's `coeff` values sum to `1.0` and every key is a valid `SubjectKey`
- [x] 2.3 Ensure every program has 2022/2023/2024 cutoff values, a positive `budgetSeats`, a non-empty `tuition`, a `dorm` boolean, and a non-empty `electives` list of valid electives
- [x] 2.4 Add `getProgram(id)` lookup returning the program or `undefined`, plus derived distinct `FIELDS` and `CITIES` lists

## 3. Benefit catalog (§10 data)

- [x] 3.1 Define `BenefitDef` (key, label, desc, bonus) and export `BENEFITS` with `village` (+0.02), `quota` (+0.04), `orphan` (+0.02), each with Ukrainian label/description

## 4. Data freshness (BC-HONESTY-01)

- [x] 4.1 Export `DATA_SESSION` = 2024, a human-readable `DATA_AS_OF` label, and a `DATA_DISCLAIMER` note flagging the data as illustrative samples, not an official registry

## 5. Tests

- [x] 5.1 Assert the registry length is exactly 11 and all ids are unique
- [x] 5.2 Assert every program's coefficients sum to `1.0` (within tolerance) and use only valid subject keys
- [x] 5.3 Assert each program has three cutoff years and non-empty seats/tuition/electives
- [x] 5.4 Assert the benefit catalog exposes the three expected bonuses and that `getProgram` returns matches / `undefined` correctly

## 6. Validation and docs

- [x] 6.1 Run lint and the unit test suite; confirm the data assertions pass
- [x] 6.2 Run `openspec validate add-program-data --strict` and confirm it passes
- [x] 6.3 Update `docs/current-state.md` with a program-data entry
