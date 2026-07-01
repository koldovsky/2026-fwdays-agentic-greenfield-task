# Current state

Running hand-off log. **Newest entry first.** Read at the start of a session; append
at the end of one. `docs/requirements.md` is ground truth — this file is a memory aid.
See AGENTS.md → "Read first — project docs" for the format.

---

## 2026-06-30T23:30Z — Implemented `add-auth` (33/35 tasks)

**Done:** `/opsx:apply add-auth` — auth capability end to end. Shared: pure `validatePassword`
(100% cov) + auth contracts. API: `User`/`AuthIdentity`/`RefreshToken` + migration; `AuthModule`
with argon2 hashing, short-lived access JWT + sha256-hashed rotating refresh tokens (reuse
detection + logout revocation), Google id_token verification with provision/link, and
`JwtAuthGuard`/`@CurrentUser`/`GET /auth/me`. Mobile: secure token store, fetch client with
transparent refresh-on-401, `useAuth` context, and a token-styled auth screen (email/password +
Google PKCE) with an auth gate. Committed in 7 focused layers on `dev`. FR-AUTH-01→06, NFR-SEC-01.

**State now:** `npm run gate` green; mobile lint+typecheck green; **13 API e2e pass** (password
signup/signin/weak/dup/badcreds, refresh rotate + reuse-reject, logout, Google provision/link,
/me 401+200). `openspec validate add-auth --strict` passes. Change is 4/4 artifacts, 33/35 tasks.

**Next steps:** Two tasks remain: 8.4 (mobile restyle — waits on brand decision) and 9.4
(`/opsx:archive add-auth`). Mobile flow is typecheck/lint-clean but **not yet run on a device**
(no simulator here) — verify the sign-in/up/Google flow on-device before archiving. Then
Phase 1 continues with app-shell + theming.

---

## 2026-06-30T23:00Z — Proposed `add-auth` (Phase 1, capability 01)

**Done:** `/opsx:propose add-auth` — created the change with all 4 artifacts (proposal, design,
specs/auth/spec.md, tasks), `valid --strict`. Covers FR-AUTH-01→06 + NFR-SEC-01: email/password
+ Google (OAuth2+PKCE) sign-in, one account per verified email, JWT access + DB-backed rotating
refresh with reuse detection, argon2 hashing, `JwtAuthGuard`/`@CurrentUser`, and a shared pure
`validatePassword`. 9 task groups, test-first shared → api → mobile.

**State now:** Planning only, no implementation yet. `add-auth` is the active OpenSpec change.

**Next steps:** `/opsx:apply add-auth` to implement (start with the shared validator, test-first).
Auth-screen final styling still waits on the brand decision (backend/shared work is unblocked).

---

## 2026-06-30T22:45Z — Archived `add-foundation`; `foundation` spec promoted

**Done:** Completed the last two foundation tasks (3.5 boot verified this session; 6.3 archive)
and ran `/opsx:archive add-foundation` (sync chosen). The delta promoted into
`openspec/specs/foundation/spec.md` (6 requirements, validates ✓); the change moved to
`openspec/changes/archive/2026-06-30-add-foundation/`. No active OpenSpec changes remain.

**State now:** `foundation` is now a living spec. On `dev`, committed. Phase 0 done.

**Next steps:** Resolve the honey-vs-blackwork brand decision (gates Phase 1 UI), then
`/opsx:propose add-auth` to start the next capability.

---

## 2026-07-01T14:10Z — Mobile forms + state conventions (RHF+Zod, Zustand)

**Done:** Added an AGENTS.md rule: mobile forms validate with **React Hook Form + Zod**
(via `@hookform/resolvers`), reusing shared validators; shared/app **state uses Zustand**
(`src/store/`), not Context. Applied it: migrated the auth Context to a Zustand
`useAuthStore`, and rebuilt `AuthScreen` with RHF + Zod schemas that call the shared
`validatePassword` (one policy for client + server). Zod 4 needed the `standardSchemaResolver`
(the `zodResolver` overloads don't match Zod 4). Removed `AuthContext.tsx`. Installed
react-hook-form, zod, @hookform/resolvers, zustand.

**State now:** Mobile typecheck + lint green; iOS bundle exports clean (721 modules). No
dedicated OpenSpec/agent skill for RHF/Zod/Zustand exists in the registry, so none installed —
libraries + the AGENTS rule + existing vercel react/react-native skills cover it.

**Next steps:** Continue on-device auth verification; `openspec archive add-auth` when done.

---

## 2026-07-01T13:45Z — Unique bundle id for device signing

**Done:** Device build failed signing because `com.honeydo.app` is already registered to
another Apple team. Changed the bundle id (ios + android) to `com.blackflamy.honeydo` (the
id that already registered to the user's team in the earlier root build) and re-prebuilt;
the native project now signs under team ZXQ369UC2M.

**State now:** Rerun `npm run ios:device` — signing should pass and the dev build installs.

**Next steps:** Verify auth on-device (API running), then `openspec archive add-auth`.

---

## 2026-07-01T13:30Z — Fixed root-run dev-build breakage + added guardrail scripts

**Done:** Running `expo run:ios` from the repo ROOT (instead of apps/mobile) built the app
from the root project, which autolinked only root deps → the installed app lacked
`ExpoSecureStore` (runtime "Cannot find native module 'ExpoSecureStore'") and re-hit the
AppEntry error. Cleaned the root again (reverted root package.json/lock; removed root
ios/, app.json, tsconfig.json) and regenerated apps/mobile/ios cleanly — verified
ExpoSecureStore is autolinked (Podfile.lock + ExpoModulesProvider.swift register
SecureStoreModule). Added **root delegating scripts** (`npm run ios` / `ios:device` /
`android` / `prebuild`) that always target `@honeydo/mobile`, so building from the repo
root now does the right thing instead of breaking.

**State now:** apps/mobile/ios regenerated with all native modules. Rebuild with
`npm run ios:device` (works from anywhere). Old broken app on device is a different bundle
id (com.blackflamy.honeydo) — delete it; the correct one is com.honeydo.app.

**Next steps:** User reruns `npm run ios:device`, then verifies auth on-device (API must be
running). Then `openspec archive add-auth` (task 9.4).

---

## 2026-07-01T13:00Z — iOS dev build enabled (prebuild verified)

**Done:** Prepared a development build (expo-dev-client) for physical-device testing since
Expo Go is too old on the user's phone. Ran `expo prebuild --clean` from `apps/mobile` →
generated `apps/mobile/ios/Honeydo.xcworkspace`, CocoaPods installed clean (98 pods),
monorepo autolinking works. Mobile `ios`/`android` scripts now use `expo run:*`; root
`.gitignore` guards a stray root `/ios`. `apps/mobile/ios` is gitignored.

**State now:** Native iOS project generated and buildable on this machine (Xcode 26.6,
CocoaPods 1.16.2). Device install still requires the user's Apple ID signing + a connected
iPhone (can't be done here). API must run for the app to work (Docker was down this session).

**Next steps:** In Xcode, set the signing Team on the Honeydo target (unique bundle id if
com.honeydo.app collides), then `npx expo run:ios --device`. Then `openspec archive add-auth`
(task 9.4) once auth is verified on-device.

---

## 2026-06-30T22:38Z — Fixed `npm run api` boot failure + committed foundation

**Done:** Diagnosed the reported `Cannot find module .../dist/main` error: root cause was
`incremental: true` (tsconfig) + `deleteOutDir: true` (nest-cli) desyncing — nest wipes `dist/`
but the `.tsbuildinfo` (outside dist) survives, so tsc skips emit and `dist/main` never exists.
Fixed by setting `incremental: false` in `apps/api/tsconfig.build.json`; verified with a hard
repro (stale tsbuildinfo + deleted dist now re-emits). Also found **port :3000 is occupied by
another local app ("Qnous")** — moved the API default to **:3333** (`main.ts`, `.env(.example)`,
AGENTS.md). Then committed the previously-uncommitted `foundation` work (it had never been
committed — the AGENTS rule is agent guidance, not automation) in focused commits on `dev`.

**State now:** `npm run gate` green (~21 s); `npm run db:up && npm run migrate && npm run api`
boots on :3333 and `/health` returns ok. Working tree committed on `dev`.

**Next steps:** `openspec archive add-foundation` (task 6.3) once satisfied, then resolve the
brand decision and `openspec new change add-auth`.

---

## 2026-07-01T01:25Z — `foundation` capability: OpenSpec proposal + gaps closed

**Done:** Proposed and implemented the `add-foundation` OpenSpec change (proposal/design/
specs/tasks, validated `--strict`). Formalized the monorepo skeleton as the `foundation`
spec and closed the two known gaps. Added the NFR-DX-01 backend quality gate (root `npm
run gate` = `build:shared && lint && typecheck && test && build:api`), enabled full
TypeScript `strict` in `apps/api` (was partial), added a global `ValidationPipe` +
`class-validator`/`class-transformer` (TC-STACK-02), enforced 100% coverage on shared
pure modules via `vitest.config.ts` (TC-PURE-01), added a mobile ESLint no-raw-hex guard
(FR-THEME-03, theme dir exempt), and added the Expo Dev Client path (`expo-dev-client`
+ `prebuild` script + `apps/mobile/README.md`, TC-STACK-01). Touches TC-STACK-01/02,
TC-PURE-01, TC-TEST-01, NFR-DX-01.

**State now:** `npm run gate` green on a clean checkout in ~21 s (< 60 s budget). Mobile
lint/typecheck green; hex guard verified to fire in app code and pass in `src/theme`.
Shared coverage 100% on `duration.ts`. 23/24 change tasks done.

**Next steps:** Task 3.5 (boot-against-Postgres + `/health` e2e) is unverified this
session — **Docker was unavailable** here (it was verified end-to-end in the 2026-06-30
session). Re-run `npm run db:up → migrate → api` with Docker, then
`openspec archive add-foundation` (task 6.3). After that, resolve the brand decision and
`openspec new change add-auth`.

---

## 2026-06-30T22:00Z — Added review-before-commit rule

**Done:** Added an AGENTS.md Workflow rule: review the full diff and run a review pass
(`/code-review`) plus `lint`/`typecheck`/`test` before every commit; never commit unreviewed
or red changes.

**State now:** On `dev`, tree clean after this commit. Docs-only change.

**Next steps:** Unchanged — resolve the brand decision, then `openspec new change add-auth`.

---

## 2026-06-30T21:55Z — Per-capability docs + git workflow on `dev`

**Done:** Added `docs/capabilities/` (one file per capability, numbered by build order, with
FR/NFR/TC mapping, scope, non-goals, risks) + an index. Added an AGENTS.md rule: **commit after
every change to the `dev` branch** (branch from `main`, focused commits, reference IDs, never
commit to `main` directly). Created the `dev` branch and committed all prior uncommitted work in
4 focused commits (scaffold, design system, openspec init, docs). Gitignored
`.claude/settings.local.json`.

**State now:** On `dev`, working tree clean. `main` unchanged (advances via reviewed merge).
Capabilities documented; OpenSpec specs/changes still not scaffolded.

**Next steps:** Resolve the brand decision, then `openspec new change add-auth` and implement
test-first — committing each step to `dev`.

---

## 2026-06-30T21:45Z — Capability split + implementation order (OpenSpec)

**Done:** Wrote `docs/implementation-plan.md` — splits `requirements.md` into 10 OpenSpec
capabilities (+ a foundation phase) with full FR/NFR/TC ID mapping, a dependency graph, a
phased build order, cross-cutting concerns, and risks. Maps each capability to a candidate
`openspec/changes/add-<capability>/` proposal. OpenSpec is initialized (CLI 1.4.1; `specs/`
still empty).

**State now:** Plan only — no specs/changes scaffolded yet. Recommended first change:
`openspec new change add-auth`. Note the brand-mismatch risk gates any UI work (Phase 1).

**Next steps:** Resolve the honey-vs-blackwork brand decision, then scaffold `add-auth` as the
first OpenSpec change and implement test-first.

---

## 2026-06-30T21:41Z — Project docs wired into AGENTS.md

**Done:** Added a "Read first — project docs" section to AGENTS.md instructing agents to
use `docs/requirements.md` (source of truth) + `docs/product-brief.md` (narrative), and
to maintain this `current-state.md` each session. Bootstrapped this file.

**State now:** Convention documented and seeded. No code changed.

**Next steps:** Begin implementing against the requirements (auth / app-shell / time-entries
core loop). Note an unresolved brand mismatch: the brief/PRD describe a "dark/blackwork-leaning"
identity, but the integrated design system (DESIGN.md, `honeydo-design` skill) is a warm
honey theme — reconcile which is canonical before building UI (FR-THEME-*, BC-BRAND-01).

---

## 2026-06-30T21:34Z — Local Postgres + API boot verified end-to-end

**Done:** Added `docker-compose.yml` (Postgres 16, host port **5434** to avoid clashes with
other local Postgres on 5432/5433). Root scripts `db:up`/`db:down`/`db:reset`. Updated
`apps/api/.env` + `.env.example` to port 5434. Ran first Prisma migration (`init`) creating
the `TimeEntry` table. Touches TC-STACK-03.

**State now:** `npm run db:up` → `npm run migrate` → `npm run api` works. Server boots,
connects to Postgres, `GET http://localhost:3000/health` returns the shared `HealthStatus`.
Container `honeydo-pg` may still be running.

**Next steps:** Build real endpoints (time-entries CRUD) with class-validator DTOs (TC-STACK-02),
backed by `PrismaService`. Add auth (FR-AUTH-*).

---

## 2026-06-30T21:15Z — Backend scaffolded: @honeydo/api + @honeydo/shared

**Done:** Scaffolded NestJS 11 app `@honeydo/api` (`apps/api`) with Prisma (pinned 6.19.3;
Prisma 7 dropped `url` in schema), a global `PrismaModule`/`PrismaService`, `ConfigModule`,
and a `GET /health` endpoint returning the shared `HealthStatus` type. Created framework-free
`@honeydo/shared` (`packages/shared`): API contracts (`contracts.ts`) + tested pure duration
logic (`duration.ts`, 5 passing tests). Unified TypeScript to `~6.0.3` across packages and made
the api tsconfig TS-6-clean. Touches TC-STACK-02/03, TC-PURE-01, TC-TEST-01.

**State now:** All green — `shared` build (CJS) + tests, `api` build + test, `mobile` typecheck.

**Next steps:** See entry above (DB/run) — now done.

---

## 2026-06-30T23:15Z (local) — Mobile app scaffolded + design system integrated

**Done:** Set up npm-workspaces monorepo root. Scaffolded Expo SDK 57 + TS app `@honeydo/mobile`
(`apps/mobile`) with monorepo `metro.config.js` and a typed design-token theme (`src/theme/`,
`useTheme()`). Installed the design system as the `honeydo-design` skill and wrote `DESIGN.md`
(production token reference, RN mapping). Touches TC-STACK-01, FR-THEME-03.

**State now:** `mobile` typechecks; starter screen renders from tokens. Run with `npm run mobile`.

**Next steps:** Build the app shell + tab navigation (FR-SHELL-01). Reconcile brand mismatch
flagged in the top entry.
