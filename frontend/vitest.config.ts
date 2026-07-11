import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest config — unit tests only. We exclude `tests/steps/**` (Playwright
 * E2E specs) and `tests/pom/**` (Playwright Page Object Model) so the two
 * runners do not collide. Path alias `@/*` matches the Next.js / tsc config.
 *
 * Phase 1 plan 01: co-located `*.test.ts` files next to the modules they
 * cover (e.g. `src/lib/translationConfigSchema.test.ts`) are also
 * included. The convention is: a test file that lives next to a module
 * tests ONLY that module; the legacy `tests/unit/` tree is for tests
 * that span multiple modules or have heavier fixture needs.
 */
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "src/lib/**/*.test.ts"],
    environment: "node",
  },
});
