---
name: scaffold
description: Bootstrap the Edda project skeleton from doc/plans/stack.md — pnpm + Vite + Vue + strict TS + the src/ layout + Vitest/ESLint/Prettier, then wire the format-on-edit hook. Use once, on the empty repo.
disable-model-invocation: true
---

# Scaffold the Edda project

This repo is greenfield (design docs only, no code). This skill stands up the initial skeleton
described in `doc/plans/stack.md` and `doc/plans/architecture.md`. **Those docs are the source of
truth** — re-read them for current pinned versions and the directory layout; do not trust versions
hardcoded here if the docs disagree.

Run from the repo root. Steps:

1. **Re-read the spec.** Read `doc/plans/stack.md` (versions, ADRs) and `doc/plans/architecture.md`
   (§ directory layout) before touching anything.

2. **Init + deps.** `pnpm init`, then add runtime deps:
   Vite (Rolldown) · Vue 3.5 · Vue Router 5 · Pinia 3 + Pinia Colada · Tailwind 4 · Dexie 4 ·
   `@readium/shared` · pdfjs-dist · vite-plugin-pwa.
   Dev deps: Vitest · ESLint (+ `eslint-plugin-vue`, typescript-eslint) · Prettier · `@vitejs/plugin-vue`.
   Use the version ranges from `stack.md`.

3. **tsconfig.json** with `"strict": true`, `"noUncheckedIndexedAccess": true`,
   `"moduleResolution": "bundler"`.

4. **Directory layout** (from `architecture.md`):
   `src/core/{model,contracts,registry,dispatch,sniff,bridge,sync}`,
   `src/plugins/{connectors,formats}`, `src/platform/web`, `src/app`, plus `sw.ts` and `vendor/`.
   Keep `src/core/contracts` free of any DOM / `fetch` / `window` reference — it must be
   platform-neutral for the future native client.

5. **Scripts** in package.json: `dev` (vite), `build` (vite build), `test` (vitest),
   `lint` (eslint), `format` (prettier --write).

6. **Vendor foliate-js** as a git submodule under `vendor/` pinned to the SHA in `stack.md`
   (no npm release exists). Own the CFI↔Locator adapter.

7. **Wire the format-on-edit hook.** Invoke the `update-config` skill (its "Constructing a Hook"
   flow) to add a `PostToolUse` hook with matcher `Write|Edit` running
   `pnpm exec prettier --write` on the edited file, written to `.claude/settings.json`, pipe-tested
   and `jq -e`-validated. Do this only after Prettier is installed (step 2).

8. **Verify green.** `pnpm install`, then `pnpm run lint` and `pnpm test` — both should pass on the
   empty skeleton. Report what was created.
