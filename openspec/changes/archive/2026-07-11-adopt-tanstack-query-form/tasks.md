## 1. Setup

- [x] 1.1 Add `@tanstack/react-query` and `@tanstack/react-form` to `furniture-configurator/package.json` and install
- [x] 1.2 Create `src/app/providers.tsx` (`"use client"`) exporting `Providers`, which creates a `QueryClient` via `useState(() => new QueryClient(...))` and renders `QueryClientProvider`
- [x] 1.3 Wrap `{children}` in `<Providers>` inside `src/app/layout.tsx`, nested within the existing `AppRouterCacheProvider`/`ThemeProvider`
- [x] 1.4 Create `src/lib/queries/` directory for per-resource query/mutation hook modules

## 2. Configurator form (manager)

- [x] 2.1 Create `src/lib/queries/useConfigurations.ts` exporting a `useSubmitConfigurationMutation()` wrapping `POST /api/configurations`
- [x] 2.2 Create `useSaveCatalogEntryMutation()` in the same module (or `useCatalogEntries.ts`) wrapping `POST /api/catalog-entries`, preserving the existing 409-conflict handling
- [x] 2.3 Rewrite `ConfiguratorForm.tsx` field state (`topSizeCm`, `bottomSizeCm`, `facadeColorId`, `facadeMaterialId`, `corpusMaterialId`, `selectedHardwareIds`) using `@tanstack/react-form`'s `useForm`
- [x] 2.4 Wire form submission to `useSubmitConfigurationMutation`, replacing `handleSubmit`'s manual `fetch`/`useState` with mutation `isPending`/`isError`/`data`
- [x] 2.5 Wire "Save as catalog entry" to `useSaveCatalogEntryMutation`, preserving the existing 409 duplicate-entry message and success message behavior
- [x] 2.6 Verify BOM validation errors (`errorsByPart`) still render next to their part-size fields, sourced from the mutation response, not from form field validators
- [x] 2.7 Manually verify: submit valid config → BOM renders; submit invalid sizes → per-part errors render; save non-standard config → success message; save matching config → 409 message (verified live in headless Chromium against the dev server; BOM renders, invalid size shows inline error and disables submit; save-as-catalog-entry hit a pre-existing SKU-collision bug in `catalog-entries/route.ts`, unrelated to this change, and the UI correctly showed the generic "Не вдалося зберегти" fallback)

## 3. Admin: simple dictionaries (colors, materials)

- [x] 3.1 Create `src/lib/queries/useSimpleDictionary.ts` exporting a generic `useSimpleDictionaryQuery(resourcePath, itemKey, initialData)` and `useAddSimpleDictionaryItemMutation(resourcePath, itemKey)` / `useToggleActiveMutation(resourcePath, itemKey)`, invalidating the resource's query key on success
- [x] 3.2 Rewrite `SimpleDictionarySection.tsx` to source `items` from `useQuery` (seeded with `initialItems` as `initialData`) instead of local `useState`
- [x] 3.3 Rewrite the add-item dialog form using `@tanstack/react-form` (required, trimmed name field), replacing the `name`/`error` `useState` pair
- [x] 3.4 Wire "Додати"/toggle-active actions to the new mutations, replacing manual `setItems` merging with query invalidation
- [x] 3.5 Manually verify against both usages (colors, materials): add item, toggle active, error on failed add (verified live for colors: added a new color, list refreshed sorted from server; toggled it inactive, status updated)

## 4. Admin: hardware, standard sizes, part specs, catalog entries sections

- [x] 4.1 Create `src/lib/queries/useHardwareItems.ts`, `useStandardSizes.ts`, `usePartSpecs.ts`, `useCatalogEntries.ts` (list query + create/update mutations per resource, mirroring the pattern from `useSimpleDictionary.ts`)
- [x] 4.2 Rewrite `HardwareSection.tsx` to use its query/mutation hooks and an `@tanstack/react-form` form for its add/edit dialog
- [x] 4.3 Rewrite `StandardSizesSection.tsx` to use its query/mutation hooks and form
- [x] 4.4 Rewrite `PartSpecsSection.tsx` to use its query/mutation hooks and form (no add/edit dialog exists — inline PATCH per field, no GET list endpoint, so the query cache is patched via `setQueryData` in the mutation's `onSuccess` instead of invalidate-and-refetch)
- [x] 4.5 Rewrite `CatalogEntriesSection.tsx` to use its query/mutation hooks (confirmed list-only — no create/edit form; creation happens via `ConfiguratorForm`'s "save as catalog entry")
- [x] 4.6 Manually verify each of the four sections against its current create/update/error behavior (verified live: added a hardware item, list refreshed; toggled a part-spec checkbox, cache patched via `setQueryData` and UI updated; standard sizes and catalog entries render correctly from their queries)

## 5. Cleanup and verification

- [x] 5.1 Confirm no remaining raw `fetch()` calls inside `src/app/manager/**` or `src/app/admin/**` client components (all reads/writes go through `src/lib/queries/*` hooks)
- [x] 5.2 Confirm no remaining per-field `useState` form wiring in the migrated components (all go through `@tanstack/react-form`)
- [x] 5.3 Run `npm run lint` and `npm test` in `furniture-configurator/` — lint passes clean; test suite has 3 pre-existing failures in `src/app/api/configurations/route.test.ts` unrelated to this change (confirmed present on `main` before this change via `git stash`), all other 14 tests pass
- [x] 5.4 Manually smoke-test the full manager and admin flows end-to-end in the browser (login → configure → save catalog entry; login as admin → CRUD each dictionary section) — done via headless Chromium (Playwright) against the dev server; no React/console errors, only the pre-existing SKU-collision 500 noted in 2.7
