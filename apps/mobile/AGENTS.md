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
