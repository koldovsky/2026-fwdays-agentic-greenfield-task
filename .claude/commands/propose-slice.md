---
description: Open an OpenSpec change for one «Гривня» capability slice, tied to its baseline spec and FR ids, ready for kurs-maker.
argument-hint: <capability> (e.g. converter, currency-list, rate-history)
---

Open a change folder for the **$1** slice and prepare it for implementation.

Steps:

1. **Ground in the spec.** Read `openspec/specs/$1/spec.md` and the matching FR
   rows in `docs/requirements.md`. If `$1` is not an existing capability, list the
   capabilities under `openspec/specs/` and stop.

2. **Create the change.**
   ```bash
   npx --no-install openspec new change "add-$1"
   ```

3. **Author the artifacts** (proposal.md, design.md, tasks.md) in the change folder,
   driven by the baseline spec — do not invent scope:
   - **proposal.md** — Why (cite the FR ids for `$1`), What Changes (the spec's
     requirements as user-visible behaviour), Impact (which `lib/` modules,
     components, routes; dependencies on prior slices per `docs/mvp-capability-plan.md`).
   - **design.md** — key decisions, the pure-`lib/` module(s) and their signatures,
     error handling (how every input error surfaces inline; how NBU failure degrades),
     risks.
   - **tasks.md** — tests-first order: ① failing unit tests from each spec scenario
     (`@trace FR-x`, observed RED) → ② pure `lib/` logic to green → ③ UI with
     `@/components/ds` + loading/empty/error states → ④ eval case → ⑤ `npm run verify`.

4. **Validate the change.**
   ```bash
   npx --no-install openspec validate "add-$1" --strict --no-interactive
   ```

5. **Hand off.** Tell me the change is ready and to run **kurs-maker** on it
   (tests-first). Do not implement here — proposing only. Update
   `docs/current-state.md` with the new active change.
