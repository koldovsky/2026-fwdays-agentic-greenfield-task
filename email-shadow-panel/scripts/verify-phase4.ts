import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const PHASE4_REQUIRED_FILES = [
  "api/_probe/emailnator.ts",
  "api/health.ts",
  "api/inboxes.ts",
  "api/inboxes/messages.ts",
  "api/inboxes/messages/[messageReference].ts",
  "docs/agentic-process.md",
  "docs/runbooks/deployment.md",
  "docs/runbooks/rollback.md",
  "docs/tasks/phase-4-deployment-production-verification.md",
  "docs/verification/phase-4.md",
  "package.json",
  "scripts/phase4-smoke.ts",
  "scripts/verify-phase4.ts",
  "src/server.ts",
  "tests/phase4/deployment-readiness.test.ts",
  "tests/phase4/smoke-script.test.ts",
  "vite.config.ts",
  ".env.example",
] as const;

export const PHASE4_SECRET_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: "capability bearer header", pattern: /Authorization:\s*Bearer\s+[A-Za-z0-9._-]{20,}/i },
  { name: "Vercel token", pattern: /\bvercel_[A-Za-z0-9._-]{12,}\b/i },
  { name: "provider cookie", pattern: /gmailnator_session=(?!redacted)[^;\s]+/i },
  { name: "provider xsrf cookie", pattern: /XSRF-TOKEN=(?!redacted)[^;\s]+/i },
  {
    name: "dotenv secret assignment",
    pattern:
      /^(?:SESSION_ENCRYPTION_KEY|VISITOR_HASH_KEY|UPSTASH_REDIS_REST_TOKEN|PHASE0_PROBE_TOKEN|PHASE0_SESSION_KEY)=(?!replace-with-)/im,
  },
];

export const PHASE4_CLIENT_BUNDLE_PATTERNS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
  { name: "server session module path", pattern: /server\/(?:api|providers|session)\//i },
  { name: "server module import path", pattern: /\.server\.(?:t|j)sx?/i },
  {
    name: "api route path",
    pattern:
      /(?:^|\/)api\/(?:_probe\/emailnator|health|inboxes(?:\/messages(?:\/\[messageReference\])?)?)\.(?:t|j)sx?/i,
  },
  { name: "phase 0 probe env", pattern: /PHASE0_(?:SESSION_KEY|PROBE_TOKEN|CAPSULE)/i },
  { name: "upstash env", pattern: /UPSTASH_REDIS_REST_(?:URL|TOKEN)/i },
  { name: "visitor hash env", pattern: /VISITOR_HASH_KEY/i },
  { name: "session encryption env", pattern: /SESSION_ENCRYPTION_KEY/i },
];

function isClientFacingAsset(filePath: string): boolean {
  return /\.(?:js|mjs|cjs|css|html)$/i.test(filePath);
}

function isClientJavaScriptAsset(filePath: string): boolean {
  return /\.(?:js|mjs|cjs)$/i.test(filePath);
}
const PROJECT_ROOT = process.cwd();

function walkFiles(entryPath: string): string[] {
  const stat = statSync(entryPath);
  if (stat.isFile()) {
    return [entryPath];
  }

  if (!stat.isDirectory()) {
    return [];
  }

  return readdirSync(entryPath).flatMap((child) => walkFiles(resolve(entryPath, child)));
}

export function readTextFile(relativePath: string): string {
  return readFileSync(resolve(PROJECT_ROOT, relativePath), "utf8");
}

export function assertRequiredFilesPresent(): void {
  for (const relativePath of PHASE4_REQUIRED_FILES) {
    assert.ok(
      existsSync(resolve(PROJECT_ROOT, relativePath)),
      `Missing required Phase 4 artifact: ${relativePath}`,
    );
  }
}

export function assertNoSensitiveText(relativePaths: readonly string[]): void {
  for (const relativePath of relativePaths) {
    const absolutePath = resolve(PROJECT_ROOT, relativePath);
    for (const filePath of walkFiles(absolutePath)) {
      if (/verify-[^/\\]+\.ts$/u.test(filePath)) {
        continue;
      }

      const text = readFileSync(filePath, "utf8");
      for (const { name, pattern } of PHASE4_SECRET_PATTERNS) {
        assert.ok(!pattern.test(text), `Sensitive pattern detected in ${filePath}: ${name}`);
      }
    }
  }
}

export function parseEnvExample(text = readTextFile(".env.example")): Map<string, string> {
  const entries = new Map<string, string>();

  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    assert.ok(separatorIndex > 0, `Malformed env line: ${line}`);
    const key = line.slice(0, separatorIndex);
    const value = line.slice(separatorIndex + 1);
    assert.ok(!entries.has(key), `Duplicate env variable in .env.example: ${key}`);
    entries.set(key, value);
  }

  return entries;
}

export function assertEnvExampleMatchesCode(): void {
  const env = parseEnvExample();
  const expectedKeys = [
    "EMAILNATOR_PROBE_ENABLED",
    "PHASE0_PROBE_TOKEN",
    "PHASE0_SESSION_KEY",
    "SESSION_ENCRYPTION_KEY",
    "VISITOR_HASH_KEY",
    "SESSION_TTL_SECONDS",
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
    "REDIS_KEY_NAMESPACE",
    "EMAILNATOR_PROVIDER_ENABLED",
    "PUBLIC_API_REQUEST_TIMEOUT_MS",
    "PUBLIC_API_MAX_ACTIVE_INBOXES_PER_VISITOR",
    "PUBLIC_API_CREATE_LIMIT_PER_VISITOR",
    "PUBLIC_API_CREATE_LIMIT_PER_IP",
    "PUBLIC_API_CREATE_WINDOW_SECONDS",
    "PUBLIC_API_READ_LIMIT_PER_CAPABILITY",
    "PUBLIC_API_READ_WINDOW_SECONDS",
    "PUBLIC_API_OPERATION_LOCK_TTL_MS",
    "PUBLIC_VISITOR_COOKIE_NAME",
    "PUBLIC_VISITOR_COOKIE_MAX_AGE_SECONDS",
  ] as const;

  assert.deepEqual([...env.keys()], [...expectedKeys]);
  assert.equal(env.get("EMAILNATOR_PROBE_ENABLED"), "false");
  assert.equal(env.get("PHASE0_PROBE_TOKEN"), "replace-with-an-internal-preview-only-bearer-token");
  assert.equal(
    env.get("PHASE0_SESSION_KEY"),
    "replace-with-a-high-entropy-secret-for-phase0-session-capsules",
  );
  assert.equal(
    env.get("SESSION_ENCRYPTION_KEY"),
    "replace-with-a-32-byte-base64url-or-64-hex-session-encryption-key",
  );
  assert.equal(
    env.get("VISITOR_HASH_KEY"),
    "replace-with-a-32-byte-base64url-or-64-hex-visitor-hash-key",
  );
  assert.equal(env.get("SESSION_TTL_SECONDS"), "900");
  assert.equal(env.get("UPSTASH_REDIS_REST_URL"), "https://replace-with-upstash-redis-rest-url");
  assert.equal(env.get("UPSTASH_REDIS_REST_TOKEN"), "replace-with-upstash-redis-rest-token");
  assert.equal(env.get("REDIS_KEY_NAMESPACE"), "email-shadow-panel");
  assert.equal(env.get("EMAILNATOR_PROVIDER_ENABLED"), "true");
  assert.equal(env.get("PUBLIC_API_REQUEST_TIMEOUT_MS"), "12000");
  assert.equal(env.get("PUBLIC_API_MAX_ACTIVE_INBOXES_PER_VISITOR"), "3");
  assert.equal(env.get("PUBLIC_API_CREATE_LIMIT_PER_VISITOR"), "5");
  assert.equal(env.get("PUBLIC_API_CREATE_LIMIT_PER_IP"), "20");
  assert.equal(env.get("PUBLIC_API_CREATE_WINDOW_SECONDS"), "3600");
  assert.equal(env.get("PUBLIC_API_READ_LIMIT_PER_CAPABILITY"), "60");
  assert.equal(env.get("PUBLIC_API_READ_WINDOW_SECONDS"), "60");
  assert.equal(env.get("PUBLIC_API_OPERATION_LOCK_TTL_MS"), "15000");
  assert.equal(env.get("PUBLIC_VISITOR_COOKIE_NAME"), "esp_anon_v1");
  assert.equal(env.get("PUBLIC_VISITOR_COOKIE_MAX_AGE_SECONDS"), "2592000");
}

export function assertDeploymentSurface(): {
  apiEntryCount: number;
  expectedFunctionEntries: number;
} {
  const apiFiles = walkFiles(resolve(PROJECT_ROOT, "api")).filter(
    (filePath) => filePath.endsWith(".ts") && !filePath.endsWith(".d.ts"),
  );
  const apiEntryFiles = apiFiles.filter((filePath) => !filePath.endsWith("test.ts"));
  const normalizedEntryFiles = apiEntryFiles.map((filePath) => filePath.replace(/\\/g, "/"));

  assert.equal(apiEntryFiles.length, 5, "The Vercel API surface should contain five entry files.");
  assert.ok(
    normalizedEntryFiles.some((filePath) =>
      filePath.endsWith("api/inboxes/messages/[messageReference].ts"),
    ),
  );
  assert.ok(
    existsSync(resolve(PROJECT_ROOT, "src/server.ts")),
    "The TanStack Start server entry is missing.",
  );
  assert.ok(
    !existsSync(resolve(PROJECT_ROOT, "vercel.json")),
    "This repository should not need a vercel.json file.",
  );

  return {
    apiEntryCount: apiEntryFiles.length,
    expectedFunctionEntries: apiEntryFiles.length + 1,
  };
}
export function assertViteConfigParses(): void {
  const viteConfigText = readTextFile("vite.config.ts");
  assert.match(viteConfigText, /import\s+\{\s*nitro\s*\}\s+from\s+["']nitro\/vite["'];/u);
  assert.match(viteConfigText, /tanstackStart\(\{/u);
  assert.match(viteConfigText, /server:\s*\{\s*entry:\s*"server"\s*\}/u);
  assert.match(viteConfigText, /nitro\(\)/u);
  assert.ok(
    viteConfigText.indexOf("tanstackStart({") < viteConfigText.indexOf("nitro()"),
    "TanStack Start should configure before Nitro.",
  );
  assert.ok(
    viteConfigText.indexOf("nitro()") < viteConfigText.indexOf("react()"),
    "Nitro should configure before React so the SSR build remains wrapped correctly.",
  );
}

export function assertNitroOutputSurface(): void {
  const nitroRoot = resolve(PROJECT_ROOT, ".output");
  const nitroPublicRoot = resolve(nitroRoot, "public");
  const nitroServerEntry = resolve(nitroRoot, "server/index.mjs");
  const nitroManifest = resolve(nitroRoot, "nitro.json");

  assert.ok(existsSync(nitroRoot), "The Nitro output directory is missing.");
  assert.ok(existsSync(nitroPublicRoot), "The Nitro public output directory is missing.");
  assert.ok(existsSync(nitroServerEntry), "The Nitro server entry is missing.");
  assert.ok(existsSync(nitroManifest), "The Nitro manifest is missing.");
  assert.ok(walkFiles(nitroPublicRoot).length > 0, "The Nitro public output is empty.");
}

export function assertClientBundleFreeOfServerOnlyModules(): void {
  const clientBundleRoot = resolve(PROJECT_ROOT, ".output/public");
  assert.ok(existsSync(clientBundleRoot), "The Nitro public output is missing.");

  const clientAssets = walkFiles(clientBundleRoot).filter(isClientFacingAsset);
  assert.ok(clientAssets.length > 0, "The Nitro public output is empty.");
  assert.ok(
    clientAssets.some(isClientJavaScriptAsset),
    "The Nitro public output does not contain any generated client JavaScript assets.",
  );

  for (const filePath of clientAssets) {
    const text = readFileSync(filePath, "utf8");
    for (const { name, pattern } of PHASE4_CLIENT_BUNDLE_PATTERNS) {
      assert.ok(
        !pattern.test(text),
        `Nitro public output contains a server-only pattern in ${filePath}: ${name}`,
      );
    }
  }
}

export function assertDeploymentDocsAreSanitized(): void {
  assertNoSensitiveText(["docs", "scripts", "tests/phase4", ".env.example"]);
}

export function assertSmokeScriptIsNotAutoWired(): void {
  const packageJson = JSON.parse(readTextFile("package.json")) as {
    scripts?: Record<string, string>;
  };

  const scripts = packageJson.scripts ?? {};
  assert.ok(scripts["smoke:phase4"], "The smoke script is missing from package.json.");
  assert.ok(scripts["test:phase4"], "The Phase 4 test script is missing from package.json.");
  assert.ok(scripts["verify:phase4"], "The Phase 4 verify script is missing from package.json.");
  assert.ok(
    !scripts["test:deterministic"]?.includes("smoke:phase4"),
    "Deterministic tests must not auto-run smoke.",
  );
  assert.ok(
    !scripts["verify:phase4"]?.includes("smoke:phase4"),
    "Deterministic verification must not auto-run smoke.",
  );
}

export function assertNitroDependencyLocked(): void {
  const packageJson = JSON.parse(readTextFile("package.json")) as {
    devDependencies?: Record<string, string>;
  };
  const lockfile = JSON.parse(readTextFile("package-lock.json")) as {
    packages?: Record<string, { version?: string; devDependencies?: Record<string, string> }>;
  };

  assert.equal(packageJson.devDependencies?.nitro, "3.0.260603-beta");
  assert.equal(lockfile.packages?.[""]?.devDependencies?.nitro, "3.0.260603-beta");
  assert.equal(lockfile.packages?.["node_modules/nitro"]?.version, "3.0.260603-beta");
}

export function runPhase4ReadinessChecks(): void {
  assertRequiredFilesPresent();
  assertViteConfigParses();
  assertNitroDependencyLocked();
  assertEnvExampleMatchesCode();
  const footprint = assertDeploymentSurface();
  assert.equal(
    footprint.expectedFunctionEntries,
    6,
    "The deployment footprint should stay under the Vercel Hobby function limit.",
  );
  assertNitroOutputSurface();
  assertDeploymentDocsAreSanitized();
  assertSmokeScriptIsNotAutoWired();
  assertNoSensitiveText(["docs", "scripts", "tests/phase4", ".env.example"]);
  console.log(
    `Phase 4 readiness checks passed. Expected deployment footprint: ${footprint.apiEntryCount} API entries + 1 SSR entry = ${footprint.expectedFunctionEntries}. The deployed Vercel function count remains provisional until human Preview verification.`,
  );
}

const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;

if (isMain) {
  runPhase4ReadinessChecks();
  assertClientBundleFreeOfServerOnlyModules();
}
