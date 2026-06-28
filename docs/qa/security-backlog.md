# Security backlog (deferred findings)

Real findings surfaced by the review-gate that fall OUTSIDE the slice that surfaced them.
They are recorded here so they are not lost; each becomes a gated hardening slice. Not a
regression from any single feature slice.

| ID | Source slice review | Finding | Severity | Owner / when |
|----|---------------------|---------|----------|--------------|
| SEC-BL-01 | cabinet-shell | No rate limiting / lockout on the sign-in server action (`app/sign-in/actions.ts`); against the single shared HR account this allows online password guessing, and each attempt runs scrypt (CPU DoS vector). | major | auth-hardening slice — per-IP + per-email sliding window with backoff, durable store (Vercel-compatible, e.g. Upstash). Pairs with the deferred add-auth nit #5 (CSRF). |
| SEC-BL-02 | cabinet-shell | Proxy guard trusts the signed access JWT alone; a revoked/deleted HR user keeps access until the short access token expires. No `HrUser.isActive` flag; sessions are only revoked on explicit sign-out and rotation. | major | auth-hardening slice — add account-status, revoke all sessions on deactivation/password change, confirm subject still active on refresh. |
| SEC-BL-03 | cabinet-shell | `npm audit`: 5 moderate transitive advisories — `postcss <8.5.10` (build-time XSS in stringify) under `next 16.2.9`; `@hono/node-server <1.19.13` (serveStatic bypass) under Prisma dev tooling. No critical/high; low real exploitability. | moderate | dependency-maintenance — pin/override `postcss >=8.5.10`; update Prisma dev tooling when a non-breaking fix lands. Do NOT run `npm audit fix --force` (it downgrades next/prisma). |
| SEC-BL-04 | cabinet-shell (contested) | Sign-out POST (`app/api/auth/sign-out`) has no CSRF/Origin check; SameSite=Lax allows a top-level cross-site POST to force logout (low impact — logout only). | minor | auth-hardening — validate `Origin`/`Sec-Fetch-Site` (same-origin) on state-changing routes/actions. |
