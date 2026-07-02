import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// --- FSD import boundaries (docs/system-design.md §5) ---------------------
// A slice may import only from layers BELOW it; same-layer imports via the
// `@/` alias are forbidden (slice-internal code uses relative paths).
// NOTE (flat config): a later matching config REPLACES a rule wholesale, so
// each files-block below carries its full combined pattern list.

const layerPatterns = (layers) =>
  layers.map((layer) => ({
    group: [`@/${layer}`, `@/${layer}/*`],
    message: `FSD: this layer may not import from '${layer}' (imports go downward only).`,
  }));

// Slices are imported only through their index.ts public API (§5.4).
// shared/* is segments, not slices — deep paths there stay allowed.
const publicApiPattern = {
  group: ["@/entities/*/*", "@/features/*/*", "@/widgets/*/*", "@/views/*/*"],
  message:
    "FSD: import a slice only via its index.ts public API (e.g. '@/entities/bullet').",
};

// shared/lib is framework-free (TC-PURE-01) — must run in plain Node.
const frameworkFreePattern = {
  group: ["next", "next/*", "react", "react-dom", "react/*"],
  message: "TC-PURE-01: shared/lib is framework-free — no next/react imports.",
};

const restrict = (...patterns) => ({
  "no-restricted-imports": ["error", { patterns }],
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/app/**"],
    rules: restrict(publicApiPattern),
  },
  {
    files: ["src/views/**"],
    rules: restrict(...layerPatterns(["app", "views"]), publicApiPattern),
  },
  {
    files: ["src/widgets/**"],
    rules: restrict(
      ...layerPatterns(["app", "views", "widgets"]),
      publicApiPattern,
    ),
  },
  {
    files: ["src/features/**"],
    rules: restrict(
      ...layerPatterns(["app", "views", "widgets", "features"]),
      publicApiPattern,
    ),
  },
  {
    files: ["src/entities/**"],
    rules: restrict(
      ...layerPatterns(["app", "views", "widgets", "features"]),
      publicApiPattern,
    ),
  },
  {
    files: ["src/shared/**"],
    rules: restrict(
      ...layerPatterns(["app", "views", "widgets", "features", "entities"]),
      publicApiPattern,
    ),
  },
  {
    files: ["src/shared/lib/**"],
    rules: restrict(
      ...layerPatterns(["app", "views", "widgets", "features", "entities"]),
      publicApiPattern,
      frameworkFreePattern,
    ),
  },
]);

export default eslintConfig;
