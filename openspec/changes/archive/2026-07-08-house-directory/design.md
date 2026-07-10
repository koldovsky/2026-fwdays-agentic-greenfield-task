# Design: house-directory (S-03)

## Context

S-02 left a working auth layer: global `SessionGuard` with `@Public()`
allowlist, `AuthContext` (current user) on the web side, `authGuard` +
401 interceptor, Prisma models `user`/`otp_code`/`session`. S-03 adds the
first domain entity (`house`) and establishes the owner-isolation pattern
(FR-ACCESS-01, NFR-SEC-03) that S-04+ will copy for tickets, feed items and
attachments. Constraints: BC-PRIN-01 (notebook-simple), ADR-0001/0002 stack,
ADR-0009 web conventions (zoneless + OnPush, signals + facades,
container/presentational), Material tokens only in styles (В-04).

## Goals / Non-Goals

**Goals:**

- `house` table + migration; CRUD API scoped to the session owner.
- One canonical owner-check idiom (404-style) reusable by later slices.
- Houses screen in the SPA + `/login` redirect for authenticated users.
- Test surface proving isolation (two-user scenarios in api-e2e).

**Non-Goals:**

- Tickets, the `ticket → house` FK itself (S-04 adds it with the migration
  for the `ticket` table).
- Directory pagination/search/sorting UI — full list render (personal
  directory is small by nature, BC-PRIN-01).
- Optimistic UI/offline; standard load → mutate → reload is enough.

## Decisions

### D1. Data model

```prisma
model House {
  id        BigInt   @id @default(autoincrement())
  userId    BigInt   @map("user_id")
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String   @db.VarChar(255)
  note      String?  @db.VarChar(1000)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@index([userId])
  @@map("house")
}
```

- Follows the existing schema idiom (BigInt AI ids, snake_case `@map`,
  `onDelete: Cascade` from `user` like `session`). PRD §9.1 defines `house`
  as name + note; `name` doubles as the address line (FR-HOUSE-01 «назва/
  адреса» is one field).
- Length caps (255/1000) are validation-level guards, not product rules —
  DTO validation mirrors them so the DB never truncates silently.

### D2. API shape

REST under the global guard (no `@Public()`), ids serialized with
`Number(id)` as in `auth.controller.ts`:

- `GET /api/houses` — owner's list, `createdAt DESC`.
- `POST /api/houses` — create; body `{ name, note? }`, trimmed, name
  required (400 otherwise).
- `GET /api/houses/:id` · `PATCH /api/houses/:id` · `DELETE /api/houses/:id`.

Owner check idiom (the precedent for S-04+): every id-scoped operation
resolves the row with `WHERE id = :id AND user_id = :sessionUserId`; zero
rows → `NotFoundException` with the same body for "missing" and "foreign"
(FR-ACCESS-01). No pre-fetch + compare — one query, no information leak,
no TOCTOU window.

### D3. FR-HOUSE-02 without a ticket table

Delete refusal ("house has tickets") is specified now but the `ticket`
relation only exists from S-04. In S-03 the service performs the delete
directly (no ticket count exists to check); S-04 adds the FK with
`onDelete: Restrict` **plus** an explicit service-level check that maps to
the understandable Ukrainian error (409-style). Rationale: inventing a
placeholder check against a nonexistent table would be dead code (fallow
would flag it); the spec scenario stays and becomes testable in S-04.
Alternative rejected: shipping the `ticket` table early — violates
one-slice-one-capability.

### D4. Web feature structure (ADR-0009)

```
web/src/app/features/houses/
  houses.routes.ts          # lazy, canActivate: [authGuard]
  houses-facade.ts          # signals: houses, loading, error; CRUD methods
  houses-api.ts             # HttpClient service, /api/houses
  houses-page/              # container (list + actions)
  house-form-dialog/        # presentational form (create/edit), Material dialog
```

- Facade owns state as signals; components are OnPush consumers — same
  pattern as `AuthFacade`. Reload-after-mutation (no local cache patching).
- Delete uses a confirm step; API errors (validation, delete refusal)
  surface as Ukrainian messages near the action (snackbar).
- Home gets a nav entry «Будинки» so the screen is reachable (spec
  requirement); route `/houses`.

### D5. /login redirect

A `guestGuard` (`CanActivate`) on the auth routes: if `AuthContext` reports
an authenticated user, return `router.parseUrl('/')`, else `true`. Mirror
image of the existing `authGuard`, lives next to it in `web/src/app/core/`.
Alternative rejected: redirect inside the login component (`ngOnInit`) —
guards are the routing-level idiom already established.

### D6. Testing strategy

- **api unit:** service owner-scoping and validation logic (Prisma mocked).
- **api-e2e:** two-user isolation suite — user B gets 404 on A's house for
  GET/PATCH/DELETE and identical body for a nonexistent id; CRUD happy path;
  auth required (401 without cookie).
- **web unit:** facade + guard (`guestGuard` redirect both ways).
- **Playwright:** directory happy path (login → create → edit → delete,
  empty state) and the authenticated `/login` redirect — derived from the
  plan's acceptance scenarios.

## Risks / Trade-offs

- [S-04 forgets to enforce FR-HOUSE-02] → the spec scenario stays in
  `openspec/specs/house-directory/spec.md` as accepted-but-latent behavior;
  the traceability matrix row for FR-HOUSE-02 marks the test as "S-04";
  S-04's proposal must reference it (noted in its plan item via the FK).
- [Isolation regression in later slices] → the api-e2e two-user suite is the
  template; each later slice copies it for its objects (plan §4 item 4).
- [BigInt ids leak as strings/objects in JSON] → follow the established
  `Number(id)` serialization; safe while ids ≪ 2^53 (POC scale).

## Migration Plan

One Prisma migration (`house` table), additive only — no impact on existing
tables; deploy is the ordinary Docker image push (migrations run on start as
in S-01/S-02). Rollback = revert commits; the table is unused by older code.

## Open Questions

- None blocking. UI composition details (dialog vs inline form) are left to
  implementation within ADR-0009 conventions.
