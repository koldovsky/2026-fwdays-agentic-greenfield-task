import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests target the framework-free core under `lib/` (TC-PURE-01) plus the
// thin persistence wrappers under `src/storage/`. Default env is node; storage
// tests opt into jsdom per-file via `// @vitest-environment jsdom`.
export default defineConfig({
  resolve: {
    // Mirror the tsconfig `@/*` -> repo-root path alias.
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["lib/**/*.test.ts", "src/**/*.test.ts"],
  },
});
