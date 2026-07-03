# Design — add-security-hardening

## Context

Vouch has two public unauthenticated write endpoints — `POST /api/tailor` (runs the LLM
pipeline) and `POST /api/auth/register` (creates an account) — and neither has any abuse
protection today. The PRD already defines the limits (`NFR-COST-02`: 1 lifetime anonymous,
2 lifetime free-account, unlimited paid) and the `usage-counter` entity already has the pure
gating logic (`canTailor`, `remainingTailorings`), but nothing calls it: there's no repo
wiring it to Postgres and no route enforces it. Separately, there are no HTTP security
headers anywhere (`NFR-SEC-03`) and no per-IP throttling or bot resistance (`NFR-SEC-04`).

This repo has no Redis yet (`add-docker-dev-env` specs one but it isn't stood up — see
`docs/current-state.md`), so rate limiting must work single-instance, in-memory, today.

## Goals

- Every response carries the standard security headers, without breaking `next/font` Google
  Fonts or Tailwind's injected styles (`NFR-SEC-03`).
- `POST /api/tailor` actually enforces `NFR-COST-02`'s limits for both anonymous (per-IP) and
  logged-in-free (per-account) callers, reusing the existing pure `usage-counter` entity.
- A filled honeypot field silently no-ops instead of erroring, so scripted submitters get no
  signal that they were detected (`NFR-SEC-04`).
- All of the above fail calm — NDJSON error events on the open tailor stream, JSON errors on
  register — never a raw exception, never an HTTP 429 that breaks the streaming contract
  (`NFR-OBS-01`).
- Failed or rejected attempts never consume the usage budget; only a successful `result`
  event increments the counter.

## Decisions

- **Rate limiting is in-memory / single-instance for now.** A pure sliding-window core
  (`shared/lib/rate-limit`, `TC-PURE-01`) takes an injected `clock: () => number` and an
  injected `store` (`Map`-like `get`/`set`), so it is fully unit-testable with a fake clock —
  no real timers. A thin adapter wraps it with a module-level `Map` and real `Date.now()` for
  route-handler use. **This does not survive multiple server instances or restarts** — it is
  a stopgap matching this repo's current no-Redis-yet state. The seam is the `store`
  parameter: swapping in a Redis-backed store (ties to the already-speced
  `openspec/changes/add-docker-dev-env`, which specs Redis for BullMQ) is a drop-in adapter
  change later, no call-site change.
- **Account-kind detection is a stub.** `currentUserId()` returning non-null today only means
  "has a session" — there is no subscription/payments capability wired up yet
  (`add-payments-emulator` is speced but unbuilt). So account kind for the rate-limit/usage
  decision is: `null` user id → `"anonymous"`; any non-null user id → `"free"`. **This is a
  deliberate stub, not a design gap**: once `add-payments-emulator` ships a real
  `getSubscription(user)`, the route swaps this one branch for a real plan lookup and `"paid"`
  becomes reachable. Flagged here explicitly so it isn't mistaken for a forgotten case.
- **Two independent gates, both enforced, on `POST /api/tailor`:**
  - Anonymous: a per-IP sliding-window limiter, window = 24h, max = `ANON_TAILORING_LIMIT`
    (already 1) from `entities/usage-counter` — reusing the existing constant instead of a
    second hardcoded "1" keeps the limit defined in one place.
  - Logged-in free: the existing pure `canTailor(counter, "free")` from `entities/usage-counter`,
    fed by a new `usage-counter-repo` (`get`/`increment` over the already-migrated
    `usage_counters` table — no new migration needed).
  - Paid: no gate (`canTailor` already returns `true` unconditionally for `"paid"`; unreachable
    today per the stub above, wired for when it becomes reachable).
- **Charge only on success.** The route already distinguishes a real `result` event from a
  `failed` status (task 3.4's fix). The rate-limit/increment call happens only after a
  `result` event was actually yielded — mirrors `FR-TAILOR-03`'s "failed retries aren't
  charged" so a flaky LLM call never burns a user's only free tailoring.
- **New error code, not an HTTP 429.** `POST /api/tailor` streams NDJSON on an already-open
  200 response (`NFR-OBS-01`'s calm-failure contract, established in task 3.3/3.4); a hard
  429 would break that contract for a request that's already mid-stream. Adds
  `TailorErrorCode = "rate_limited"` alongside the existing `"failed" | "empty_input"`,
  checked *before* the LLM provider is resolved, so a throttled request never touches the LLM.
- **Honeypot, not a CAPTCHA.** A single extra text field (`name="website"`), visually hidden
  off-screen (not `display:none`, which basic bots skip when scraping for visibility), added
  to `TailoringForm` and `SignInForm`'s sign-up fields. A non-empty value on submit means the
  submitter is a bot; the client silently no-ops (`TailoringForm`: never calls
  `streamTailoring`, no error shown) rather than revealing detection. This is client-side only
  in this pass — a determined attacker who skips the browser entirely still reaches the route
  and hits the rate limiter, which is the real backstop.
- **Headers via `next.config.ts` `headers()`,** not per-route, so every response (including
  static/landing) is covered without touching route handlers individually. CSP is scoped to
  what the app actually uses today: self + `next/font`'s Google Fonts host, inline styles for
  Tailwind's injected `<style>` tags, no third-party script/analytics hosts (`BC-PRIVACY-01`
  already forbids trackers, so the CSP has nothing else to allow).

## Non-goals

- Redis-backed / multi-instance rate limiting — tracked as a follow-up once
  `add-docker-dev-env`'s Redis is actually stood up.
- CAPTCHA, device fingerprinting, or any bot-detection beyond a honeypot.
- Real "paid" plan detection — depends on `add-payments-emulator` shipping; the stub above is
  the explicit seam.
- Rate-limiting `GET` routes (`/api/account/export`) or the NextAuth catch-all — those require
  an authenticated session already and are not the abuse surface this change targets.

## Risks

- **In-memory store resets on redeploy/restart** and does not share state across serverless
  instances — on Vercel this means the anonymous per-IP limit is weaker than "1 per IP per
  24h" in practice (each cold instance starts a fresh window). Acceptable for now because the
  logged-in-free path (the real budget control) is backed by Postgres, not memory; anonymous
  is a soft deterrent until Redis lands.
- **CSP too strict breaks Google Fonts or Tailwind** — verified locally via `next build` +
  `next start` before landing (see tasks.md verification step), not just unit tests.
- **IP header spoofing** (`x-forwarded-for` is client-influenceable without a trusted proxy
  config) — acceptable for a soft deterrent; not a substitute for the per-account limit.
