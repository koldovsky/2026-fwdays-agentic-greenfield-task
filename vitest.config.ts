import { defineConfig } from "vitest/config";

// JSX/TSX is transformed by vitest's built-in esbuild using tsconfig's
// `jsx: "react-jsx"` (automatic runtime) — no @vitejs/plugin-react needed
// (that plugin targets Fast Refresh and pins an older vite major).
const alias = { "@": new URL("./src", import.meta.url).pathname };

// Two projects, two environments:
// - `pure`  : shared/lib + entities logic stays framework-free (TC-PURE-01) —
//             node env, no DOM, only `.test.ts`.
// - `dom`   : component/widget render tests run in jsdom — only `.test.tsx`.
export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "pure",
          environment: "node",
          include: ["src/**/*.{test,spec}.ts"],
          globals: false,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.{test,spec}.tsx"],
          setupFiles: ["./vitest.setup.ts"],
          globals: true,
        },
      },
    ],
  },
});
