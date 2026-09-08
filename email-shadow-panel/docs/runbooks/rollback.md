# Rollback Runbook

## Purpose

This runbook covers safe rollback when the deployment or environment variables need to be reverted.

## Principles

- prefer redeploying the last known-good Vercel deployment over mutating code in place
- disable the provider through the kill switch before investigating noisy failures
- do not use broad Redis deletion commands
- do not roll back blindly to a schema-incompatible release
- preserve evidence without storing secrets

## Immediate Containment

If the app is misbehaving in Preview or Production:

1. set `EMAILNATOR_PROVIDER_ENABLED=false` in the affected environment scope
2. redeploy that scope
3. confirm create, list, and detail return the safe provider-disabled response
4. confirm delete and health remain available

## Last Known Good Redeploy

If code rollback is needed:

1. identify the last known-good Vercel deployment
2. use Vercel's redeploy or promote flow for that deployment
3. confirm the deployment uses the same environment-variable scope that the code expects
4. confirm the current Nitro-backed TanStack Start SSR entry and the Nitro-owned public API routes under `routes/api/*` still resolve as expected

## Encryption And Schema Compatibility

Be careful when changing session-related keys or rolling back across schema changes.

- changing `SESSION_ENCRYPTION_KEY` invalidates existing encrypted sessions
- changing `VISITOR_HASH_KEY` invalidates visitor-hash lookups and effectively retires existing session references
- changing `PHASE0_SESSION_KEY` invalidates Phase 0 probe capsules
- do not roll back to a build that expects an older or incompatible encrypted-session schema unless you intend to invalidate sessions

If a schema migration is suspected, keep the current code and recover by redeploying a compatible build instead of forcing a blind rollback.

## Disposable Session Cleanup

To clear disposable test sessions without exposing Redis values:

1. use the application delete endpoint for the known capability token when you still have it in the current process
2. for Preview-only cleanup, remove only the specific Redis keys associated with the known session if the human has a targeted, audited procedure
3. never use a broad namespace wipe, `FLUSHDB`, or any unbounded delete command
4. never paste Redis values into Codex or documentation

## Post-Rollback Checks

After rollback or redeploy:

- confirm `/api/health` still returns only `ok` or `degraded` and is served by the Nitro route layer
- confirm the provider-disabled or provider-enabled state matches the chosen environment variables
- confirm the browser app still loads
- confirm logs remain free of secrets
- confirm any disposable Preview test sessions are cleared safely

## Evidence Preservation

Keep the human-facing evidence in:

- Vercel deployment history
- Vercel logs
- this repository's verification docs

Do not store secrets or provider captures in the worktree.
