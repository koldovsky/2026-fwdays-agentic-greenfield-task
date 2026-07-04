## 1. Tooling and dependencies

- [x] 1.1 Run `npx shadcn@latest init` (New York style, CSS variables, `@/` alias) and add `button`, `input`, `label`, `card` components (TC-STACK-02)
- [x] 1.2 Install `class-variance-authority`, `clsx`, `tailwind-merge`; add `lib/utils.ts` with `cn()` helper
- [x] 1.3 Add `experimental.optimizePackageImports: ['lucide-react']` to `next.config.ts`

## 2. Theme tokens and globals

- [x] 2.1 Replace `app/globals.css` variables with full light/dark token set from DESIGN.md (`--background`, `--foreground`, `--muted`, `--card`, `--border`, `--primary`, `--primary-fg`, `--accent`, `--destructive`)
- [x] 2.2 Map tokens in `@theme inline` for Tailwind utilities; remove Arial fallback — use Geist via font variables
- [x] 2.3 Add anti-flash inline script in layout to apply stored/system dark class before hydration (theme-system spec)

## 3. i18n dictionary

- [x] 3.1 Create `lib/i18n/uk.ts` with shell strings: app title, empty heading, helper text, footer labels (NFR-I18N-01, BC-BRAND-01)
- [x] 3.2 Create `lib/i18n/index.ts` with typed `t()` accessor; verify no exclamation marks in copy
- [x] 3.3 Set `lang="uk"` on `<html>` and Ukrainian metadata in `app/layout.tsx`

## 4. Theme provider and toggle

- [x] 4.1 Implement `components/theme/theme-provider.tsx` — class-based dark mode on `<html>`, `localStorage` key `motroute-theme`, system default
- [x] 4.2 Implement `components/theme/theme-toggle.tsx` client component with visible focus ring (ui-components spec)
- [x] 4.3 Wrap app in `ThemeProvider` from `app/layout.tsx`

## 5. Layout shell components

- [x] 5.1 Implement `components/layout/site-header.tsx` — wordmark "MotoRoute", optional `children` slot for future clock, theme toggle (FR-SHELL-01)
- [x] 5.2 Implement `components/layout/site-footer.tsx` — OSM and OSRM external links with `noopener noreferrer` (BC-BRAND-02)
- [x] 5.3 Implement `components/layout/app-shell.tsx` — flex column, `h-14` header, `flex-1` main, compact footer; responsive padding at 768/1280 px (FR-SHELL-02)
- [x] 5.4 Implement `components/empty-state/config-panel.tsx` — Card with Ukrainian heading and calm placeholder copy, no inputs yet (FR-SHELL-03)

## 6. Page integration

- [x] 6.1 Replace `app/page.tsx` — remove default Next.js marketing content; render `<AppShell>` with centered `<ConfigPanel />`
- [x] 6.2 Verify main area vertically centers empty state; no map, sidebar, or default route rendered

## 7. Verification

- [x] 7.1 Run `npm run lint && npm run build` — must pass without errors
- [x] 7.2 Manual check at 375 px, 768 px, 1280 px: layout adapts, no horizontal scroll
- [x] 7.3 Manual check: theme toggle switches light/dark and persists on reload; footer links open correctly
- [x] 7.4 Confirm no analytics scripts, cookies beyond theme preference, or console noise in happy path (BC-PRIVACY-01, NFR-OBS-01)
