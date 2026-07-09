## 1. Rate limit core + usage-counter wiring

- [x] 1.1 `shared/lib/rate-limit`: pure sliding-window core (`checkRateLimit`) taking an
      injected clock + store (`TC-PURE-01`); unit tests with a fake clock (over-limit within
      window rejected, resets after window elapses)
- [x] 1.2 `shared/lib/rate-limit`: thin in-memory adapter (module-level `Map`, real `Date.now`)
      for route-handler use
- [x] 1.3 `shared/lib/db/usage-counter-repo.ts`: `get`/`increment` over `usage_counters`
      (already migrated in `add-persistence`); export from `shared/lib/db` barrel

## 2. Wire enforcement into `POST /api/tailor`

- [x] 2.1 Determine account kind (`currentUserId()` null → `anonymous`, else `free` — stub
      noted in design.md) and request IP before resolving the LLM provider (NFR-SEC-04)
- [x] 2.2 Anonymous: per-IP rate limiter, window 24h, max `ANON_TAILORING_LIMIT`; over-limit →
      calm `rate_limited` NDJSON error + `status:failed`, no LLM call (NFR-COST-02, NFR-OBS-01)
- [x] 2.3 Logged-in free: `usage-counter-repo.get` + `canTailor(counter, "free")`; same calm
      rejection path when false
- [x] 2.4 On a successful run only (`result` event actually yielded): increment the rate-limit
      entry / usage counter; failed runs never consume budget (mirrors FR-TAILOR-03)
- [x] 2.5 New `TailorErrorCode = "rate_limited"` in `features/run-tailoring/model/types.ts` +
      barrel export; i18n copy in `shared/lib/i18n/{types,ua,en}.ts` under `tailorRun`; render
      in `TailoringForm`'s existing error-alert branch

## 3. Security headers

- [x] 3.1 `next.config.ts` `headers()`: CSP (self-only — `next/font` self-hosts the Google
      fonts at build time, so no external font host is needed; inline style for Tailwind),
      `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
      `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera,
      microphone, geolocation denied) on `/(.*)`  (NFR-SEC-03)
- [ ] 3.2 Verify locally: `next build` succeeds, `next start` serves the landing page and
      `/tailor` with fonts/styles intact (no CSP console violations)

## 4. Honeypot

- [x] 4.1 Hidden honeypot field (`name="website"`, off-screen absolute position, not
      `display:none`, `aria-hidden`, `tabIndex={-1}`) on `TailoringForm`
- [x] 4.2 Same field on `SignInForm`'s sign-up mode
- [x] 4.3 Non-empty honeypot on submit → silent no-op (never call `streamTailoring` /
      `registerAccount`, no error shown, no log) — never reveal detection (NFR-SEC-04)

## 5. Verify & review

- [ ] 5.1 agent-verify: lint/build/test green; evidence for NFR-SEC-03, NFR-SEC-04, NFR-COST-02
      (rate-limited path, usage-counter path, honeypot path, headers present)
- [ ] 5.2 Independent checker-review vs PRD + FSD import rules + TC-PURE-01 boundary
