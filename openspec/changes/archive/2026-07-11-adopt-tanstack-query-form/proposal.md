## Why

Every client component that talks to `/api/*` (the manager configurator form and all five admin dictionary/catalog sections) hand-rolls its own `fetch` + `useState` plumbing for loading, error, and result state, and every form hand-rolls one `useState` per field with manual `onChange`/`onSubmit` wiring. The pattern is copy-pasted across `ConfiguratorForm.tsx` and five admin section components, there is no shared caching (every navigation re-fetches from scratch, no loading indicators exist), and adding a new dictionary CRUD screen means re-deriving the same fetch/error/state boilerplate again. Adopting `@tanstack/react-query` for server-state (fetching, caching, mutations, invalidation) and `@tanstack/react-form` for form state (field values, validation, submission) replaces this repeated boilerplate with a shared, testable pattern before more admin/manager screens are added.

## What Changes

- Add `@tanstack/react-query` and `@tanstack/react-form` as dependencies.
- Add a client-side `QueryClientProvider` wrapped around the app (new client wrapper component consumed from `src/app/layout.tsx`, alongside the existing MUI `AppRouterCacheProvider`/`ThemeProvider`).
- Introduce query hooks for reads and mutation hooks for writes against existing `/api/*` routes (colors, materials, hardware, standard sizes, part specs, catalog entries, configurations) — no API route contracts change.
- Rework `ConfiguratorForm.tsx` and the five admin section components (`SimpleDictionarySection`, `HardwareSection`, `StandardSizesSection`, `PartSpecsSection`, `CatalogEntriesSection`) to use `useQuery`/`useMutation` instead of manual `fetch` + `useState`, and `@tanstack/react-form` instead of per-field `useState`.
- Replace ad hoc `error`/`isSubmitting` state with query/mutation-derived `isPending`/`isError`/`error`, and add visible loading/pending indicators (e.g. disabled buttons with spinners) where none exist today.
- On successful mutations, invalidate the relevant query so lists refresh from cache instead of relying on manually merging the response into local state.
- The login page (Server Action based, no client fetch) is out of scope — it has no client-side data fetching or form state to migrate.
- **BREAKING**: none — this is an internal implementation change; API contracts, validation rules, BOM generation, and catalog-matching logic are unchanged. UI behavior is preserved except for the added loading indicators.

## Capabilities

### New Capabilities
- `client-data-fetching`: Defines how the frontend fetches, caches, and invalidates server data from `/api/*` routes (query caching, loading/error state, cache invalidation after mutations).
- `client-form-state`: Defines how forms manage field state, validation, and submission (configurator form, admin dictionary/catalog CRUD forms).

### Modified Capabilities
(none — existing domain requirements in `catalog-matching`, `dictionary-management`, `product-configuration`, and `role-access` are unchanged; `ui-theming`'s requirement to preserve existing validation/submission/data behavior when restyling is respected, not altered)

## Impact

- **Dependencies**: adds `@tanstack/react-query` and `@tanstack/react-form` to `furniture-configurator/package.json`.
- **Code**: `src/app/layout.tsx` (new provider wrapper), `src/app/manager/ConfiguratorForm.tsx`, `src/app/admin/SimpleDictionarySection.tsx`, `src/app/admin/HardwareSection.tsx`, `src/app/admin/StandardSizesSection.tsx`, `src/app/admin/PartSpecsSection.tsx`, `src/app/admin/CatalogEntriesSection.tsx`.
- **New files**: a query client provider component, and likely a small `src/lib/queries/*` or co-located query/mutation hook module per resource.
- **No changes** to `src/lib/configurator/*` domain logic, Prisma schema, or API route handlers under `src/app/api/**`.
- **Tests**: existing Vitest suite for domain logic (`src/lib/configurator/*.test.ts`) is unaffected; no component tests currently exist for the migrated client components.
