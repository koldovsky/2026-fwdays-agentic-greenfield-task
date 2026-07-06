// Global Vitest setup (dashboard tasks.md §6, Stage D test-infra choice).
// Runs before EVERY test file, Node-hosted suites included — both imports
// below are inert no-ops for a plain Node test (no DOM, nothing ever
// rendered, so `cleanup()`'s tracked-container set stays empty and
// `@testing-library/jest-dom`'s matchers simply go unused) so this file
// does not change behavior for the 269 pre-existing lib/packages/route
// suites; it only matters for `apps/dashboard/components/**/*.test.tsx`
// (opted into jsdom per-file via `// @vitest-environment jsdom`, see
// `vitest.config.ts`'s own header comment).
//
// Centralizing `afterEach(cleanup)` here (rather than repeating it in every
// `*.test.tsx` file) is required because this project does NOT set Vitest's
// `test.globals: true` — `@testing-library/react`'s own auto-cleanup only
// self-registers when it detects a GLOBAL `afterEach`, which does not exist
// here (every test file imports `afterEach` explicitly from "vitest"
// instead). Without this, `render()` calls across tests in the same file
// (or across files reusing the module-level `agui-hub` singleton) would
// accumulate un-unmounted DOM, causing "found multiple elements" failures.
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
});
