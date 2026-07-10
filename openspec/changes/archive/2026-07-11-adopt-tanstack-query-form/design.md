## Context

The app is a Next.js App Router project (`furniture-configurator`) where server components (`manager/page.tsx`, `admin/page.tsx`) load initial data via Prisma and pass it as props into `"use client"` components. Those client components then do all subsequent reads/writes with raw `fetch()` calls into `/api/*` route handlers, tracking loading/error/result state with one `useState` per concern. This pattern repeats nearly identically across `ConfiguratorForm.tsx` and five admin sections (`SimpleDictionarySection`, `HardwareSection`, `StandardSizesSection`, `PartSpecsSection`, `CatalogEntriesSection`), and forms use one `useState` per field with manual `onChange` handlers. There is no shared caching, no visible loading indicators, and no shared validation pattern. `src/app/layout.tsx` already wraps the app in `AppRouterCacheProvider` → `ThemeProvider` → `CssBaseline`; this is the natural place to add a query client provider. No spec currently governs client-side fetching, caching, or form conventions — this is new ground, constrained only by `AGENTS.md` (domain logic stays in `src/lib/configurator/*`, dictionary attributes stay ID-based) and `ui-theming/spec.md` (MUI components required, existing validation/submission/data behavior preserved).

## Goals / Non-Goals

**Goals:**
- Replace repeated manual `fetch` + `useState` plumbing with `@tanstack/react-query` `useQuery`/`useMutation` for every client-side read/write against `/api/*`.
- Replace per-field `useState` form wiring with `@tanstack/react-form` for the configurator form and all admin CRUD dialogs.
- Give each migrated screen visible pending/error states derived from query/mutation status, where today there are none.
- Keep server components as the source of initial data (`initialData` seeding the query cache) so first paint stays server-rendered — no new client-side loading spinner on first load.
- Leave API route contracts, Prisma schema, and domain logic (`src/lib/configurator/*`) untouched.

**Non-Goals:**
- Migrating the login page/Server Action flow (no client fetch or form state there).
- Introducing optimistic updates — mutations invalidate and refetch rather than optimistically patching the cache, to keep the change mechanical and low-risk.
- Server-side data fetching changes (Prisma calls in server components stay as-is; they seed query cache via `initialData`, they are not replaced by `useQuery` on the server).
- A global design-system rework; MUI usage stays exactly as-is per `ui-theming/spec.md`.

## Decisions

**1. One `QueryClient` per request, provided via a new client wrapper.**
Add `src/app/providers.tsx` (`"use client"`) exporting a `Providers` component that creates a `QueryClient` with `useState(() => new QueryClient(...))` (the documented Next.js App Router pattern — avoids sharing a client across requests on the server) and renders `<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>`. `layout.tsx` wraps `{children}` in `<Providers>` inside the existing `AppRouterCacheProvider`/`ThemeProvider` nesting. Alternative considered: put `QueryClientProvider` directly in `layout.tsx` — rejected because `layout.tsx` is a server component and the provider needs `"use client"`; keeping it in a dedicated file also keeps `layout.tsx` readable.

**2. Query keys are per-resource arrays matching the API path: `["colors"]`, `["materials"]`, `["hardware-items"]`, `["standard-sizes"]`, `["part-specs"]`, `["catalog-entries"]`, and `["configurations"]` (the last is mutation-only, no list read). Each server component continues to fetch initial data via Prisma and passes it as `initialData` to the corresponding `useQuery` call in the client component, so the query cache is seeded without an extra client-side fetch on mount.**
Alternative considered: fetch everything client-side via `useQuery` with no `initialData`, dropping the server-side Prisma calls — rejected because it would add a loading spinner on first paint where none exists today, and the proposal commits to preserving current first-load behavior.

**3. One co-located query/mutation hook module per resource under `src/lib/queries/` (e.g. `useColors.ts`, `useCatalogEntries.ts`), each exporting a `useXQuery(initialData)` and the relevant `useXMutation()` hooks.**
These are thin wrappers around `useQuery`/`useMutation` + `fetch`, not domain logic, so they live outside `src/lib/configurator/*` per `AGENTS.md`'s boundary (that directory is reserved for framework-agnostic validation/BOM/matching rules). Alternative considered: inline `useQuery`/`useMutation` calls directly in each component — rejected because the five admin sections need the same shape (list query + create mutation + patch mutation) and a shared hook avoids re-deriving the invalidation logic five times, which is the exact duplication this change is meant to remove.

**4. Mutations invalidate their own query key on success (`queryClient.invalidateQueries({ queryKey: ["colors"] })` etc.) instead of manually merging the mutation response into local state.**
This replaces the current `setItems((prev) => [...prev, created])` / `setItems((prev) => prev.map(...))` pattern. Alternative considered: use the mutation response to patch the cache directly via `queryClient.setQueryData` — rejected as unnecessary optimization; invalidate-and-refetch is simpler and the datasets here are small (dictionaries, catalog entries), so the extra round-trip is not a performance concern.
**Exception found during implementation**: `PartSpecEntry` has no `GET /api/part-specs` list route (only `PATCH /api/part-specs/:id`), so `usePartSpecsQuery` has no server endpoint to refetch from. It seeds the cache from `initialData` with a no-op `queryFn` (relying on the global `staleTime: Infinity` default), and `useUpdatePartSpecMutation` patches that cache directly via `setQueryData` in `onSuccess` — the exact pattern rejected above, but the only option here since invalidation has nothing to refetch.

**5. Forms use `@tanstack/react-form`'s `useForm` with field-level validators for client-side checks (required fields, numeric ranges), while server-side validation errors (e.g. duplicate SKU, 409 conflict from `/api/catalog-entries`) surface through the mutation's `isError`/`error` state, not form field errors.**
This mirrors the current split: existing code already treats "form field invalid" and "submission failed on the server" as separate concerns (`errorsByPart` map vs `submitError` state). Alternative considered: funnel all errors through form field validators — rejected because BOM validation errors are keyed by `partRole`, not by form field names, and forcing that mapping adds complexity without benefit.

**6. Do not add a schema validation library (e.g. Zod) as part of this change.**
`@tanstack/react-form` validators can be plain functions; existing client-side checks are simple (required, numeric). Introducing schema validation is a separate concern the proposal doesn't ask for. Alternative considered: adopt Zod for form + API validation — deferred as a follow-up, not bundled here to keep this change mechanical.

## Risks / Trade-offs

- [Five admin sections migrated at once increases review surface] → Migrate and land one section at a time (tasks are ordered per-component), verifying each against the existing manual-test flow before moving to the next, rather than one large rewrite commit.
- [`initialData` in `useQuery` can mask staleness if `staleTime` isn't set, causing the query to never refetch after the initial server-rendered value] → Rely on invalidation-after-mutation as the only refetch trigger: `providers.tsx` sets a global `staleTime: Infinity` (revised during code review from an initial `staleTime: 0`, which caused every `initialData`-seeded query to redundantly refetch on every mount, duplicating the server component's Prisma fetch), since every mutation already invalidates its own query key explicitly on success.
- [No component tests exist today for these client components, so a behavioral regression during migration could go unnoticed] → Manually verify each migrated screen's create/update/error flows against the current UI behavior (per `ui-theming/spec.md`'s precedent of preserving existing validation/submission/data behavior) before considering a component "done" in `tasks.md`.
- [New dependencies increase bundle size / install surface] → Both libraries are widely used, actively maintained, and scoped to client components already marked `"use client"`; no server bundle impact.

## Migration Plan

1. Add dependencies, add `Providers` wrapper, wire into `layout.tsx`.
2. Migrate `ConfiguratorForm.tsx` first (single form, single mutation, no list/invalidation complexity) to validate the query+form pattern end-to-end.
3. Migrate the five admin sections one at a time, starting with `SimpleDictionarySection` (used twice, for colors and materials) since it's the simplest CRUD shape, then the four more specific sections.
4. No data migration, no API contract changes, no feature flag needed — this is a pure client-implementation swap behind the existing UI, so rollback is a plain revert of the affected component files if an issue surfaces.

## Open Questions

- None blocking; the two deferred items (optimistic updates, schema validation via Zod) are explicitly out of scope per Non-Goals above and can be proposed as separate follow-up changes if desired.
