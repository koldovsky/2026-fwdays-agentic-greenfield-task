## 1. Dependencies and database schema

- [x] 1.1 No new runtime dependencies.
- [x] 1.2 No database schema changes.

## 2. Failing tests first (red) — written from the spec, before implementation

- [x] 2.1 Unit: weather code maps to background condition — `@trace FR-ANIM-01`.
- [x] 2.2 Unit: location sunrise/sunset resolves day versus night — `@trace FR-ANIM-02`.
- [x] 2.3 Unit: reduced motion disables animation — `@trace FR-ANIM-03`.
- [x] 2.4 Unit: background layer stays non-interactive — `@trace FR-ANIM-04`.
- [x] 2.5 Run tests and confirm RED before implementation.

## 3. Domain/content logic (green)

- [x] 3.1 Add pure condition, daytime, and visual helpers in `lib/animated-bg/`.

## 4. Services and actions (green)

- [x] 4.1 Reuse forecast client cache for today's weather code and sun times.

## 5. UI and route handlers

- [x] 5.1 Add client `AnimatedBackground` with canvas particles and CSS gradient.
- [x] 5.2 Wire background into `WeatherExplorer`; remove static backdrop from `app/page.tsx`.

## 6. Validation, docs, and archive prep

- [x] 6.1 `npm run test:run`
- [x] 6.2 `npm run lint`
- [x] 6.3 `npm run build`
- [x] 6.4 `npx @fission-ai/openspec@latest validate add-animated-bg --strict`
- [x] 6.5 `npx @fission-ai/openspec@latest validate --all --strict`
- [x] 6.6 `node scripts/check-traceability.mjs --pre-commit --check-fresh`
- [x] 6.7 Update `docs/current-state.md`
- [x] 6.8 Run review-gate workflow; fix confirmed findings; re-run 6.1–6.6
- [x] 6.9 Manual browser smoke: background changes with location/condition; reduced motion static.
- [x] 6.10 Archive after 6.1–6.9 pass
