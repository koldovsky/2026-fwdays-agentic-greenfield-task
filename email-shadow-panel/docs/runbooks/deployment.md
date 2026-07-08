# Deployment Runbook

## Scope

This runbook covers the human steps for Preview and Production deployment on Vercel Hobby, plus the exact environment variables and safe verification steps for Email Shadow Panel.

## Repository Root Requirement

In the Vercel project settings, set **Root Directory** to `email-shadow-panel`.

The GitHub repository contains the app in that subdirectory, so the root must not be moved to the repository top level for deployment.

## Deployment Shape

The repository currently uses:

- TanStack Start for SSR
- Vite plus the Nitro Vite plugin to produce Vercel-compatible SSR output
- Nitro-owned public API routes under `routes/api/*` (Nitro filesystem routes, not TanStack route-tree files)
- Nitro must scan the project root with `serverDir: "./"` so those root `routes/api/*` handlers are actually registered by the Vercel preset
- one server-only Phase 0 probe implementation at `server/providers/emailnator/probe.server.ts` that is not a deployable route and is exercised through the local CLI `npm run probe:emailnator`
- one TanStack Start server entry at `src/server.ts`

The Nitro server runtime owns SSR and the public API routes. The Vercel-preset parity build currently emits five functions total: one `__server` SSR function plus four API functions under `routes/api/*`. The actual deployed Vercel function count remains provisional until a human Preview deployment confirms it.

The root-scanning Nitro configuration is required in addition to the file moves: keeping the handlers in `routes/api/*` is necessary, but Nitro also has to scan the project root via `serverDir: "./"` for the Vercel preset to register them.

The supported probe is the local CLI `npm run probe:emailnator`. No public HTTP probe route is deployed. The implementation remains server-only for local evidence, but it is not counted as a deployed Vercel function. Do not rely on the old standalone root `/api` function footprint.

## Vercel Import Settings

When importing the GitHub repository into Vercel, use these settings:

- Root Directory: `email-shadow-panel`
- Build Command: `npm run build`
- Install Command: leave the default, or use Vercel's default npm install behavior
- Output Directory: do not invent a custom value; keep the framework-detected default unless Vercel explicitly requires a field value
- Framework Preset: keep the framework preset that Vercel auto-detects for this TanStack Start/Vite project; the Nitro plugin supplies the Vercel-compatible SSR output. Do not add a custom adapter or `vercel.json`

After import, inspect the detected Functions list and confirm the Nitro server runtime owns SSR plus the four public API functions, with no standalone root `/api` functions. Treat the exact deployed function count as provisional until human Preview verification.

## Secret Handling Rules

- never paste real credentials into Codex
- never commit `.env` files
- never commit `.vercel`
- never paste provider cookies, XSRF values, capability tokens, Redis values, or generated inbox addresses into docs, Git, screenshots, or terminal transcripts
- enter secrets directly into Vercel's environment-variable UI

## Environment Matrix

Use the exact variable names below, derived from the implemented config loaders and `.env.example`.

| Variable                                    | Secret?    | Preview?     | Production? | Safe example format                                  | Validation rule                                                                                                                 | Rotation impact                                                               | Redeploy required? |
| ------------------------------------------- | ---------- | ------------ | ----------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------ |
| `SESSION_ENCRYPTION_KEY`                    | Secret     | Yes          | Yes         | `32-byte base64url` or `64-hex` random material      | Must decode to exactly 32 bytes                                                                                                 | Rotating it invalidates encrypted sessions                                    | Yes                |
| `VISITOR_HASH_KEY`                          | Secret     | Yes          | Yes         | `32-byte base64url` or `64-hex` random material      | Must decode to exactly 32 bytes                                                                                                 | Rotating it invalidates visitor hashes and orphans existing lookup keys       | Yes                |
| `SESSION_TTL_SECONDS`                       | Non-secret | Yes          | Yes         | `900`                                                | Positive integer, max `86400`                                                                                                   | Changes session lifetime                                                      | Yes                |
| `UPSTASH_REDIS_REST_URL`                    | Secret     | Yes          | Yes         | `https://example.upstash.io`                         | Valid HTTPS URL                                                                                                                 | Rotating it switches the backing Redis endpoint                               | Yes                |
| `UPSTASH_REDIS_REST_TOKEN`                  | Secret     | Yes          | Yes         | `replace-with-upstash-redis-rest-token`              | Non-empty string                                                                                                                | Rotating it revokes Redis API access                                          | Yes                |
| `REDIS_KEY_NAMESPACE`                       | Non-secret | Yes          | Yes         | `email-shadow-panel-preview` (Preview), `email-shadow-panel-production` (Production) | Lowercase safe Redis-key charset: `a-z0-9:_-`                                                                                   | Changing it makes previously stored records unreachable under the new namespace; it does not delete them | Yes                |
| `EMAILNATOR_PROVIDER_ENABLED`               | Non-secret | Yes          | Yes         | `true` or `false`                                    | Boolean string                                                                                                                  | Turning it off disables create/list/detail and leaves delete/health available | Yes                |
| `PUBLIC_API_REQUEST_TIMEOUT_MS`             | Non-secret | Yes          | Yes         | `12000`                                              | Integer `1000` to `60000`                                                                                                       | Changes request deadline behavior                                             | Yes                |
| `PUBLIC_API_MAX_ACTIVE_INBOXES_PER_VISITOR` | Non-secret | Yes          | Yes         | `3`                                                  | Integer `1` to `20`                                                                                                             | Changes concurrent inbox capacity per visitor                                 | Yes                |
| `PUBLIC_API_CREATE_LIMIT_PER_VISITOR`       | Non-secret | Yes          | Yes         | `5`                                                  | Integer `1` to `100`                                                                                                            | Changes create rate limit per visitor                                         | Yes                |
| `PUBLIC_API_CREATE_LIMIT_PER_IP`            | Non-secret | Yes          | Yes         | `20`                                                 | Integer `1` to `500`                                                                                                            | Changes create rate limit per IP                                              | Yes                |
| `PUBLIC_API_CREATE_WINDOW_SECONDS`          | Non-secret | Yes          | Yes         | `3600`                                               | Integer `60` to `86400`                                                                                                         | Changes create rate-limit window                                              | Yes                |
| `PUBLIC_API_READ_LIMIT_PER_CAPABILITY`      | Non-secret | Yes          | Yes         | `60`                                                 | Integer `1` to `600`                                                                                                            | Changes read rate limit per capability                                        | Yes                |
| `PUBLIC_API_READ_WINDOW_SECONDS`            | Non-secret | Yes          | Yes         | `60`                                                 | Integer `10` to `3600`                                                                                                          | Changes read rate-limit window                                                | Yes                |
| `PUBLIC_API_OPERATION_LOCK_TTL_MS`          | Non-secret | Yes          | Yes         | `15000`                                              | Integer `1000` to `60000`                                                                                                       | Changes refresh-lock lifetime                                                 | Yes                |
| `PUBLIC_VISITOR_COOKIE_NAME`                | Non-secret | Yes          | Yes         | `esp_anon_v1`                                        | Cookie-safe charset: `A-Za-z0-9_-`, length `1` to `64`                                                                          | Changing it invalidates existing browser visitor cookies                      | Yes                |
| `PUBLIC_VISITOR_COOKIE_MAX_AGE_SECONDS`     | Non-secret | Yes          | Yes         | `2592000`                                            | Integer `300` to `31536000`                                                                                                     | Changes browser cookie lifetime                                               | Yes                |

## Local Diagnostic Only

Do not configure these values in Vercel.

- `EMAILNATOR_PROBE_ENABLED`: non-secret, local CLI only. Safe example `false`. Boolean string; enables or disables the local diagnostic helper used by `npm run probe:emailnator`.
- `PHASE0_PROBE_TOKEN`: secret, local CLI only. Safe example `replace-with-an-internal-preview-only-bearer-token`. Non-empty string; rotating it invalidates probe access only.
- `PHASE0_SESSION_KEY`: secret, local CLI only. Safe example `32-byte base64url` or `64-hex` random material. Non-empty string; the decoder accepts any string and normalizes it to a 32-byte key, but random 32-byte material is recommended. Rotating it invalidates Phase 0 probe capsules.

The generic local `.env.example` uses `email-shadow-panel-local`. Preview uses `email-shadow-panel-preview` and Production reserves `email-shadow-panel-production`.

## Key Generation Commands

Generate random material locally and paste the result directly into Vercel's environment UI.

Do not paste the generated values into Codex, ChatGPT, Git, docs, screenshots, or terminal transcripts.

Recommended commands:

```bash
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"
node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))"
```

Recommended usage:

- use one freshly generated value for `SESSION_ENCRYPTION_KEY` in Preview
- use one freshly generated value for `SESSION_ENCRYPTION_KEY` in Production
- use one freshly generated value for `VISITOR_HASH_KEY` in Preview
- use one freshly generated value for `VISITOR_HASH_KEY` in Production
- use one freshly generated value for `PHASE0_PROBE_TOKEN` only when running the local diagnostic probe
- use one freshly generated value for `PHASE0_SESSION_KEY` only when running the local diagnostic probe
- never configure the local diagnostic probe values in Vercel

Using different Preview and Production encryption keys is recommended, not required by the code.

Rotating `SESSION_ENCRYPTION_KEY` invalidates existing encrypted sessions.

Rotating `VISITOR_HASH_KEY` invalidates visitor-hash lookups and effectively retires existing session references.

Rotating `PHASE0_PROBE_TOKEN` invalidates local probe access.

Rotating `PHASE0_SESSION_KEY` invalidates Phase 0 probe capsules.

## Upstash Setup

1. Create or select one Upstash Redis database.
2. Copy the HTTPS REST URL from Upstash, not a traditional Redis password.
3. Copy the REST token from Upstash, not a socket password.
4. Enter both values directly into Vercel's environment-variable UI for Preview first.
5. Repeat the same values for Production when ready.
6. Do not paste either value into Codex or documentation.

## Preview Deployment Procedure

1. Import the GitHub repository into Vercel.
2. Set Root Directory to `email-shadow-panel`.
3. Confirm the detected framework/build settings.
4. Add the Preview environment variables from the matrix above.
5. Deploy Preview.
6. Open the Preview deployment URL from Vercel.
7. Inspect the Functions tab and confirm the Nitro server runtime owns SSR and the public API routes, with no standalone root `/api` functions.
8. Inspect logs only after verifying the expected preview request path.

## Preview Smoke Procedure

Use the smoke script only after the Preview deployment is live.

```bash
npm run smoke:phase4 -- --base-url=<PREVIEW_URL>
```

The smoke script will:

1. request `/api/health`
2. create exactly one inbox
3. print the safe inbox address locally for one harmless external test email
4. pause for explicit manual confirmation
5. list messages with bounded attempts and waits
6. select one human test message without printing provider IDs
7. request one message detail
8. validate the safe response shape
9. delete the inbox session
10. confirm subsequent access fails safely
11. clear in-process sensitive state
12. print only a sanitized PASS/FAIL summary

The smoke script also supports `--health-only` for a health-only check. Human live result: the provider-enabled Preview smoke later passed, including inbox generation, one harmless test message, message listing, message detail rendering, verification-code detection, and delete/forget cleanup.

Do not run the smoke script automatically in `npm test`, `test:deterministic`, or `verify:phase4`.

## Browser Verification Checklist

Run the browser check manually in Preview.

- initial app load
- secure visitor cookie behavior
- Generate flow
- generated Gmail-style address
- external test-message delivery
- automatic or manual list refresh
- message selection
- detail rendering
- OTP detection when the harmless fixture contains a synthetic code
- reload restoration
- recent-inbox switching
- deletion
- expired or invalid session behavior where practical
- no capability in the URL, visible UI, console, or network query string
- no active hostile email HTML
- mobile and narrow layout
- reduced-motion behavior
- no fatal console errors

## Kill-Switch Verification

Preview-only procedure:

1. deploy with `EMAILNATOR_PROVIDER_ENABLED=true`
2. verify create/list/detail in Preview
3. set `EMAILNATOR_PROVIDER_ENABLED=false`
4. redeploy Preview
5. confirm create/list/detail fail with the safe provider-disabled response
6. confirm delete and health remain available
7. set `EMAILNATOR_PROVIDER_ENABLED=true`
8. redeploy Preview
9. confirm normal behavior returns

## Bounded Rate-Limit And Lock Verification

Use the smallest safe number of requests necessary.

- verify one rate-limit policy using a low Preview-only threshold such as `PUBLIC_API_CREATE_LIMIT_PER_VISITOR=1` or `PUBLIC_API_READ_LIMIT_PER_CAPABILITY=1`
- verify `Retry-After` is returned when the limit is exceeded
- restore the normal values and redeploy Preview afterward
- verify one refresh-lock contention path only when practical
- skip live lock contention if the deterministic test already covers the behavior and the live check would be abusive or noisy
- do not perform load testing or repeated Emailnator polling

## Logging Checklist

Review Vercel logs and confirm they do not contain:

- Authorization headers
- capability tokens or hashes
- visitor-cookie values
- raw IP or forwarding-header values
- generated inbox addresses when avoidable
- provider message IDs
- provider state
- cookies
- XSRF values
- Redis URLs, tokens, keys, or values
- encryption keys
- message subjects or bodies
- OTP values
- raw provider responses

Safe event fields that may appear:

- request ID
- operation name
- duration
- safe result code
- HTTP status

## Production Deployment Procedure

1. Add the Production environment variables separately from Preview.
2. Verify the Production values are not copied from Preview unless that is an explicit decision.
3. Deploy or promote Production.
4. Open the Production deployment URL.
5. Inspect the Functions tab.
6. Run the browser smoke checklist again if the human has a safe Production verification plan.
7. Confirm the public status and error responses remain safe.

## Production Readiness Rule

Do not promote Production until Preview verification, kill-switch verification, and the bounded rate-limit checks have been completed.

## Rollback Pointer

If rollback is needed, follow `docs/runbooks/rollback.md`.
