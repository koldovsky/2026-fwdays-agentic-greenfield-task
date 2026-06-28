import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror the `@/*` path alias from tsconfig.json so unit tests import the
    // same way app code does.
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    // lib/ holds pure, framework-free logic; restrict unit tests to it for now.
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
