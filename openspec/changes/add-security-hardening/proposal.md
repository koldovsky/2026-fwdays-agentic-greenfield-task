## Why

Vouch's public unauthenticated endpoints (`POST /api/tailor`, `POST /api/auth/register`)
currently have no abuse protection: no security headers, no rate limiting, and the
already-speced free-tier usage limits (`NFR-COST-02`) are never enforced in code — the
`usage-counter` entity's pure gating logic (`canTailor`) exists but nothing calls it. Any
visitor can run unlimited tailorings, burning LLM budget, and the app ships without
baseline hardening (clickjacking, MIME sniffing, referrer leakage) that costs nothing to
add. This is a security-first pass: cheap, no external dependency, no new stack decision.

## What Changes

- Add standard security response headers (CSP, `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`) to every route via `next.config.ts` (`NFR-SEC-03`).
- Add a sliding-window per-IP rate limiter (`shared/lib/rate-limit`, pure core + in-memory
  adapter) and wire it into `POST /api/tailor` for anonymous requests, plus enforce the
  existing `usage-counter` gating (`canTailor`) for logged-in free users via a new
  `usage-counter-repo` — actually implementing `NFR-COST-02`'s literal limits (1 lifetime
  anonymous, 2 lifetime free, unlimited paid).
- Add a honeypot hidden field to `TailoringForm` and `SignInForm`'s sign-up mode; a filled
  honeypot is silently dropped, never surfaced as an error (`NFR-SEC-04`).
- Rejections from either check are calm NDJSON/JSON error responses, never a raw exception
  or an unannounced HTTP 429 that breaks the streaming contract (`NFR-OBS-01`).
- Failed/rejected attempts never consume the usage budget; only a successful `result` event
  increments the counter (mirrors `FR-TAILOR-03`'s "failed retries aren't charged").

## Capabilities

### New Capabilities
- `security`: response security headers, per-IP rate limiting, honeypot bot-resistance, and
  wired-up free-tier usage gating on public unauthenticated endpoints. Serves `NFR-SEC-03`,
  `NFR-SEC-04`, `NFR-COST-02`.

### Modified Capabilities
<!-- None. Reuses the existing usage-counter entity and usage_counters table (add-persistence). -->

## Impact

- New: `shared/lib/rate-limit` (pure sliding-window core + in-memory adapter),
  `shared/lib/db/usage-counter-repo.ts`.
- Edited: `next.config.ts` (security headers), `src/app/api/tailor/route.ts` (rate limit +
  usage-counter gating), `src/features/run-tailoring/model/types.ts` (+ `index.ts` barrel) for
  a new `rate_limited` error code, `src/shared/lib/i18n/{types,ua,en}.ts` for its copy,
  `src/features/run-tailoring/ui/TailoringForm.tsx` and `src/features/sign-in/ui/SignInForm.tsx`
  for the honeypot field.
- Depends on: `add-persistence` (`usage_counters` table, already migrated), `add-auth`
  (`currentUserId()`). Ties to the already-speced `add-docker-dev-env` for a future
  Redis-backed rate-limit adapter once multi-instance deploy needs it.
- Serves: `NFR-SEC-03`, `NFR-SEC-04`, `NFR-COST-02`.
