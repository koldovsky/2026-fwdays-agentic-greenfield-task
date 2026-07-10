## Purpose

Defines how client (`"use client"`) components read and mutate server data through a cached query layer (`@tanstack/react-query`), so that server components remain the source of first-paint data and client interactions get consistent pending/error handling without ad-hoc `fetch`/`useState` wiring.

## Requirements

### Requirement: Client components fetch server data through a cached query layer
Client (`"use client"`) components that read data from `/api/*` routes SHALL do so through `@tanstack/react-query` `useQuery` hooks keyed per resource, rather than calling `fetch` directly inside component bodies or effects. Server components SHALL continue to load initial data via Prisma and pass it into the corresponding `useQuery` call as `initialData`, so first paint remains server-rendered.

#### Scenario: Admin section renders from server-provided initial data without a client fetch
- **WHEN** the admin page's server component loads a dictionary list (colors, materials, hardware items, standard sizes, part specs, or catalog entries) via Prisma and renders the corresponding client section
- **THEN** the client section displays that list immediately using `initialData`, without issuing a client-side fetch on mount

#### Scenario: List refetches after a related mutation succeeds
- **WHEN** a create or update mutation against a resource (e.g. `POST /api/colors`, `PATCH /api/standard-sizes/:id`) completes successfully
- **THEN** the query for that resource's list is invalidated and refetched so the displayed list reflects the change, without the component manually merging the mutation response into local state

### Requirement: Data-fetching state exposes pending and error status to the UI
Every `useQuery` and `useMutation` call driving a client component's data SHALL expose its `isPending`/`isError`/`error` status to the rendered UI, so the user sees a visible pending indicator during in-flight requests and an error message on failure.

#### Scenario: Mutation in flight disables its trigger and shows a pending state
- **WHEN** a manager or admin submits a create/update action (e.g. saving a catalog entry, adding a dictionary item)
- **THEN** the triggering control is disabled and a pending indicator is shown until the mutation settles

#### Scenario: Failed request surfaces an error message
- **WHEN** a query or mutation against `/api/*` fails (network error or non-OK response)
- **THEN** the UI displays an error message derived from the query/mutation `error` state, matching the existing error-reporting behavior (e.g. MUI `Alert severity="error"`)
