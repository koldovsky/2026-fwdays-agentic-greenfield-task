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
