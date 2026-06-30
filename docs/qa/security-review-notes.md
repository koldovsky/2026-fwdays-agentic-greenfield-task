# Security Review Notes — «Поливайко» (Phase 7 global review gate)

These notes record the SECURITY-dimension findings from the Phase 7 multi-dimensional
adversarial review. Every item below was adversarially verified and is recorded as a
clean-dimension **non-defect** or an explicitly **accepted** posture for the local,
single-user MVP. No security code changes were required by this review.

## Scope posture

This codebase is a deliberately single-user, no-authentication local MVP:

- **NFR-SEC-01** — the app requires no authentication in the MVP; there are no credentials,
  sessions, or password policy.
- **TC-04** — no multi-tenant data isolation, no auth provider, no email.
- **BC-02** — single user; no accounts, no sharing.

There is therefore no authorization matrix to enforce and no IDOR-across-tenants surface:
the sole local owner is the only actor. Multi-user/auth (FR-SHELL-05, NFR-SEC-02) is Future
scope. The review's authz/auth/session/tenancy checklist items are recorded as **N/A by
design**, not silently passed.

## Findings disposition

| # | Area | Disposition |
|---|------|-------------|
| 1 | Authn / authz / roles / tenancy / sessions / reset tokens | **N/A by design** (NFR-SEC-01, TC-04, BC-02). No login, session, reset, invite, or role flows exist; only Next.js server actions invoked by the single local owner. |
| 2 | SQL injection | **Clean.** All DB access goes through Drizzle's typed query builder (`eq`/`desc`/`max`, bound `.values()`/`.set()` objects). The only ``sql`` `` usages are static `sql`(CURRENT_TIMESTAMP)`` schema defaults; migrations are static DDL. No string interpolation or raw query concatenation anywhere. |
| 3 | HTML / XSS injection | **Clean.** All user-controlled free text (plant name/species, watering note) is rendered as escaped JSX text children. No `dangerouslySetInnerHTML`/`innerHTML`/`eval`/`new Function` in app/components/lib (only a test assertion). No email/PDF/template sink exists. |
| 4 | Path traversal | **N/A.** No API routes, file/download/export handlers, or `path.join` on request input. `fs` use is limited to a test and the fixed-path startup migration (`db/client.ts`, operator-controlled `DATABASE_URL`). |
| 5 | CSV / formula injection | **N/A.** No CSV/export feature in MVP (TC-04), so no `=`/`+`/`-`/`@` formula-injection surface. |
| 6 | Mass assignment / privilege escalation | **Not possible.** Write layer enumerates allowed columns explicitly (no FormData spread). There are no privileged columns (no role/isActive/owner) to escalate into. Client-supplied ids are re-validated as positive integers in every action (defense-in-depth). |
| 7 | Input validation / abuse resistance | **Bounded server-side.** name/species ≤ 200 chars; watering note rejected (not truncated) over 500 chars; intervalDays bounded 1..3650; heights >0..1000; dates must be real, non-future calendar dates. Re-validated server-side regardless of client input. |
| 8 | Rate limiting | **Accepted (none) for the local single-user MVP.** No rate limiting/throttling on server actions. There are no network-exposed auth endpoints to brute-force; the sole trusted local owner would only be throttling their own forms. Add rate limiting + per-record caps only if the app is ever deployed beyond localhost or gains auth (FR-SHELL-05). |
| 9 | Secrets & config hygiene | **Clean.** `.env.example` holds only a non-secret local `DATABASE_URL`; `.env`/`.env.*` are gitignored (with `!.env.example`). No `NEXT_PUBLIC_*` variables, so nothing secret can reach the client bundle. User-facing errors are generic Ukrainian messages; driver internals go to server-side `console.error`, never the response. |
| 10 | Dependency audit | **Accepted: dev/build-chain moderate advisories only.** `npm audit` reports 6 moderate, 0 high/critical. The notable ones — postcss <8.5.10 (build-time, via Next's tooling) and the esbuild/esbuild-kit chain (via drizzle-kit, a devDependency migration generator) — are NOT on a request-handling runtime path and are not runtime-exploitable. `npm audit fix --force` is **not** advisable: its fix is a major Next.js downgrade (next@9.3.3). Track the postcss advisory and pick it up via the normal Next patch bump; keep drizzle-kit/esbuild-kit as devDependencies so they stay out of the runtime. |

## Accepted correctness edge (security-adjacent)

- **`today` bound stale across midnight.** In a long-lived open tab, the date forms'
  `max={today}` bound (computed once server-side via `todayInKiev()`) can go stale across a
  Kiev midnight, so the native picker could reject a legitimately-today entry. **Accepted.**
  There is no data corruption: the server re-validates against its own current `todayInKiev()`
  on every write. The edge is purely cosmetic, self-correcting on refresh, and within the
  single-user local scope; revisit only if the app gains long-lived multi-session usage.

## Re-check trigger

Before any Future multi-user / auth work (FR-SHELL-05, NFR-SEC-02), re-run this full
security checklist — in particular add per-record owner/tenant scoping to every
`getPlant`/`listMeasurements`/`listWaterings` query (they currently filter only by
`id`/`plantId` and would become IDOR vectors on a shared DB), wire session handling, and
apply the NFR-SEC-02 password/timeout/link-expiry rules and rate limiting.
