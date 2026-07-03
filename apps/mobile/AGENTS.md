# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Honeydo mobile

- Expo SDK 57 + TypeScript. Part of the npm-workspaces monorepo (`@honeydo/mobile`);
  install from the **repo root** (`npm install`), not here. Metro is configured for
  the monorepo in `metro.config.js`.
- **Design tokens are in `src/theme/`** — consume via `useTheme()`; never hardcode
  raw hex, spacing, or radii. See the repo-root `DESIGN.md` for the rules and the
  canonical values, and keep `src/theme/tokens.ts` in sync with
  `.agents/skills/honeydo-design/tokens/`.
- **Match the design reference faithfully — do NOT ship a plain/greybox version.**
  Before building or changing ANY screen or component, open its reference in the
  `honeydo-design` skill (`ui_kits/honeydo/*.jsx` for screens,
  `components/**/*.jsx` for primitives) and reproduce every element it shows:
  logo/brand marks, **icons** (the Lucide set → `lucide-react-native`; app marks →
  `react-native-svg`), input labels + leading icons, dividers, hero/empty backgrounds
  (honeycomb texture + amber glow), press/focus states, and the exact copy. A screen is
  not "done" until it visually matches — functional-but-unstyled is a bug, not a step.
- If a design element can't be reproduced 1:1 in RN, port the closest equivalent and
  **note the substitution** (as DESIGN.md does for SF Symbols/fonts) — never silently
  drop it.
- **Reuse `src/components/` primitives** (`Input`, `Button`, `TextLink`, …) instead of
  re-styling inline; extend them when the design needs a new variant.
- Consume the API over REST; import contract types from `@honeydo/shared`. Never
  import the Prisma client here.
- **Forms: validate with a library, never ad-hoc.** Every form uses **React Hook Form**
  with a **Zod** schema via `@hookform/resolvers/zod` — no manual `useState` + `if`
  checks. Wrap React Native inputs in RHF's `Controller`. Where a rule already exists in
  `@honeydo/shared` (e.g. `validatePassword`), the Zod schema MUST call it so client and
  server share one policy; don't re-encode validation.
- **State: use Zustand for shared/app state** (`src/store/`), not React Context or prop
  drilling. Keep stores small and typed; components subscribe with selectors. Local,
  component-only UI state stays in `useState`.

## Project structure (place files by responsibility)

Organize `apps/mobile/src/` by concern — one clear home per kind of file. Don't dump
everything into `components/`.

- `src/screens/` — one screen per file (top-level route targets).
- `src/components/` — **reusable UI components** composed of primitives (`Input`,
  `Button`, `TextLink`). Not icons, not screens.
- `src/icons/` — **icon components** (SVG / vector). An icon is not a UI component —
  `GoogleIcon` lives here, not in `components/`.
- `src/store/` — Zustand stores (app/shared state).
- `src/api/` — API client + request helpers.
- `src/auth/` — the auth **feature/domain** (schemas, token store, hooks). Group a
  feature's own logic together; as features grow prefer a feature folder over scattering.
- `src/theme/` — design tokens + `ThemeProvider`.
- `assets/` — **static binary assets** only (images, fonts) — not code.

**Rule:** before adding a file, pick the folder that matches its responsibility; if none
fits, add a new well-named one rather than overloading `components/`. Keep imports pointing
at these homes so structure stays legible.
