## 1. Dependencies and database schema

- [x] 1.1 No new runtime or database dependencies.

## 2. Failing tests first (red) — written from the spec, before implementation

- [x] 2.1 Unit: shell copy/content includes wordmark, hero, search placeholder, and no default city — `@trace FR-SHELL-01, FR-SHELL-03`.
- [x] 2.2 Unit: layout region metadata includes mobile/tablet/desktop regions — `@trace FR-SHELL-02`.
- [x] 2.3 Run tests and confirm RED before implementation.

## 3. Domain/content logic (green)

- [x] 3.1 Add framework-free shell content in `lib/shell/shell-content.ts`.
- [x] 3.2 Add Ukrainian-first i18n scaffold in `lib/i18n/uk.ts` with English fallback in `lib/i18n/en.ts`.

## 4. Services and actions (green)

- [x] 4.1 N/A — no server actions or API services in this slice.

## 5. UI and route handlers

- [x] 5.1 Replace default `app/page.tsx` with Weather Explorer shell.
- [x] 5.2 Update metadata/lang in `app/layout.tsx`.
- [x] 5.3 Apply Sky Calm tokens and responsive shell styles in `app/globals.css`.

## 6. Validation, docs, and archive prep

- [x] 6.1 `npm run test:run`
- [x] 6.2 `npm run lint`
- [x] 6.3 `npm run build`
- [x] 6.4 `npx @fission-ai/openspec@latest validate add-shell --strict`
- [x] 6.5 `npx @fission-ai/openspec@latest validate --all --strict`
- [x] 6.6 Update `docs/current-state.md`
- [x] 6.7 Run review-gate workflow; fix confirmed findings; re-run 6.1–6.5
- [x] 6.8 Manual browser smoke: home page shows top bar, hero, search placeholder, and responsive panels.
- [x] 6.9 Archive after 6.1–6.8 pass
