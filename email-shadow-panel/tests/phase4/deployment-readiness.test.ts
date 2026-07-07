import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { publicHealthResponseSchema } from "../../server/api/contracts.server.ts";
import { createPublicApiHandlers } from "../../server/api/handlers.server.ts";
import { handleEmailnatorProbeRequest } from "../../server/providers/emailnator/probe.server.ts";
import { loadPublicApiConfig } from "../../server/api/config.server.ts";
import {
  loadSessionCoreConfig,
  loadUpstashSessionRepositoryConfig,
} from "../../server/session/config.server.ts";
import {
  assertDeploymentSurface,
  assertEnvExampleMatchesCode,
  assertNitroDependencyLocked,
  assertNitroOutputSurface,
  assertSmokeScriptIsNotAutoWired,
  assertViteConfigParses,
  parseEnvExample,
  runPhase4ReadinessChecks,
} from "../../scripts/verify-phase4.ts";

function createThrowingProxy(label: string): unknown {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(`Unexpected access to ${label}`);
      },
    },
  );
}

function createSafePublicApiDependencies(providerEnabled = false) {
  const unreachable = createThrowingProxy("health dependency") as never;
  return {
    config: { providerEnabled },
    clock: unreachable,
    logger: unreachable,
    sessionService: unreachable,
    visitorHashService: unreachable,
    rateLimiter: unreachable,
    activeInboxLimiter: unreachable,
    operationLockManager: unreachable,
  } as never;
}

function createRequest(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}

test("deployment config parses the documented safe env examples and retains the Vercel footprint", () => {
  assertViteConfigParses();
  assertNitroDependencyLocked();
  assertEnvExampleMatchesCode();

  const sessionKey = Buffer.alloc(32, 7).toString("hex");
  const visitorKey = Buffer.alloc(32, 11).toString("base64url");
  const sessionCore = loadSessionCoreConfig({
    SESSION_ENCRYPTION_KEY: sessionKey,
    VISITOR_HASH_KEY: visitorKey,
    SESSION_TTL_SECONDS: "900",
  });
  const upstash = loadUpstashSessionRepositoryConfig({
    UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "replace-with-upstash-redis-rest-token",
    REDIS_KEY_NAMESPACE: "email-shadow-panel",
  });
  const publicConfig = loadPublicApiConfig({
    EMAILNATOR_PROVIDER_ENABLED: "true",
    PUBLIC_API_REQUEST_TIMEOUT_MS: "12000",
    PUBLIC_API_MAX_ACTIVE_INBOXES_PER_VISITOR: "3",
    PUBLIC_API_CREATE_LIMIT_PER_VISITOR: "5",
    PUBLIC_API_CREATE_LIMIT_PER_IP: "20",
    PUBLIC_API_CREATE_WINDOW_SECONDS: "3600",
    PUBLIC_API_READ_LIMIT_PER_CAPABILITY: "60",
    PUBLIC_API_READ_WINDOW_SECONDS: "60",
    PUBLIC_API_OPERATION_LOCK_TTL_MS: "15000",
    PUBLIC_VISITOR_COOKIE_NAME: "esp_anon_v1",
    PUBLIC_VISITOR_COOKIE_MAX_AGE_SECONDS: "2592000",
  });
  const footprint = assertDeploymentSurface();
  assertNitroOutputSurface();

  assert.equal(sessionCore.sessionTtlMs, 900_000);
  assert.equal(upstash.namespace, "email-shadow-panel");
  assert.equal(publicConfig.providerEnabled, true);
  assert.equal(publicConfig.operationLockTtlMs, 15_000);
  assert.equal(publicConfig.activeInboxReservationTtlMs, 15_000);
  assert.equal(footprint.apiEntryCount, 5);
  assert.equal(footprint.expectedFunctionEntries, 6);
});

test("the Phase 0 probe stays blocked in production and remains preview-only", async () => {
  const response = await handleEmailnatorProbeRequest(
    createRequest("https://example.test/api/_probe/emailnator", {
      method: "POST",
      headers: { authorization: "Bearer preview-token", "content-type": "application/json" },
      body: JSON.stringify({ action: "generate" }),
    }),
    {
      env: {
        VERCEL_ENV: "production",
        EMAILNATOR_PROBE_ENABLED: "true",
        PHASE0_PROBE_TOKEN: "preview-token",
        PHASE0_SESSION_KEY: "phase0-secret",
      },
    },
  );

  assert.equal(response.status, 403);
  assert.doesNotMatch(
    await response.text(),
    /gmailnator_session|XSRF-TOKEN|provider-state|inbox-body/u,
  );
});

test("health stays minimal, does not require Redis or provider methods, and swallows internal failures", async () => {
  const noAccessHandlers = createPublicApiHandlers(async () =>
    createSafePublicApiDependencies(false),
  );
  const okResponse = await noAccessHandlers.handleHealthRoute(
    createRequest("https://esp.example/api/health", { method: "GET" }),
  );
  const okBody = publicHealthResponseSchema.parse(await okResponse.json());
  assert.deepEqual(okBody, { data: { status: "degraded" } });

  const degradedHandlers = createPublicApiHandlers(async () => {
    throw new Error("internal-health-failure");
  });
  const degradedResponse = await degradedHandlers.handleHealthRoute(
    createRequest("https://esp.example/api/health", { method: "GET" }),
  );
  const degradedBody = publicHealthResponseSchema.parse(await degradedResponse.json());

  assert.deepEqual(degradedBody, { data: { status: "degraded" } });
  assert.doesNotMatch(
    JSON.stringify(degradedBody),
    /internal-health-failure|upstash|emailnator|token|stack/u,
  );
});

test("deployment documentation and scripts stay placeholder-only and keep the smoke command opt-in", () => {
  assertSmokeScriptIsNotAutoWired();

  const docsToCheck = [
    "docs/tasks/phase-4-deployment-production-verification.md",
    "docs/verification/phase-4.md",
    "docs/runbooks/deployment.md",
    "docs/runbooks/rollback.md",
  ] as const;

  for (const relativePath of docsToCheck) {
    const text = readFileSync(resolve(process.cwd(), relativePath), "utf8");
    assert.doesNotMatch(text, /Authorization:\s*Bearer\s+[A-Za-z0-9._-]{20,}/i);
    assert.doesNotMatch(text, /\bvercel_[A-Za-z0-9._-]{12,}\b/i);
  }

  const env = parseEnvExample();
  assert.equal(env.get("PHASE0_PROBE_TOKEN"), "replace-with-an-internal-preview-only-bearer-token");
  assert.equal(
    env.get("SESSION_ENCRYPTION_KEY"),
    "replace-with-a-32-byte-base64url-or-64-hex-session-encryption-key",
  );
});

test("deployment docs describe the Nitro-backed SSR output and provisional function count", () => {
  const deploymentDocs = readFileSync(
    resolve(process.cwd(), "docs/runbooks/deployment.md"),
    "utf8",
  );
  const phase4VerificationDocs = readFileSync(
    resolve(process.cwd(), "docs/verification/phase-4.md"),
    "utf8",
  );

  assert.match(deploymentDocs, /Nitro Vite plugin to produce Vercel-compatible SSR output/u);
  assert.match(deploymentDocs, /deployed Vercel function count remains provisional/u);
  assert.match(phase4VerificationDocs, /Deployment Correction/u);
  assert.match(phase4VerificationDocs, /404: NOT_FOUND/u);
});

test("Phase 4 verifier targets Nitro public output and keeps the server boundary separate", () => {
  const verifyPhase4Source = readFileSync(
    resolve(process.cwd(), "scripts/verify-phase4.ts"),
    "utf8",
  );

  assert.ok(
    verifyPhase4Source.includes('const clientBundleRoot = resolve(PROJECT_ROOT, ".output/public")'),
  );
  assert.ok(verifyPhase4Source.includes("assertNitroOutputSurface()"));
  assert.ok(verifyPhase4Source.includes("assertClientBundleFreeOfServerOnlyModules()"));
  assert.ok(verifyPhase4Source.includes("The Nitro public output is missing."));
  assert.ok(verifyPhase4Source.includes("The Nitro server entry is missing."));
  assert.ok(!verifyPhase4Source.includes("dist/client"));
  assert.ok(
    !verifyPhase4Source.includes(
      'const clientBundleRoot = resolve(PROJECT_ROOT, ".output/server")',
    ),
  );
});

test("server-only modules remain lazily wired in source and do not require eager imports", () => {
  const apiHealth = ["api/health.ts", "server/api/composition-root.server.ts", "vite.config.ts"]
    .map((relativePath) => readFileSync(resolve(process.cwd(), relativePath), "utf8"))
    .join("\n");
  const verifyPhase4Source = readFileSync(
    resolve(process.cwd(), "scripts/verify-phase4.ts"),
    "utf8",
  );

  assert.match(apiHealth, /createPublicApiHandlers/u);
  assert.match(apiHealth, /loadPublicApiConfig/u);
  assert.doesNotMatch(apiHealth, /from\s+['"]server\/api\/composition-root\.server\.ts['"]/u);
  assert.match(verifyPhase4Source, /assertClientBundleFreeOfServerOnlyModules\(\)/u);
});

test("the readiness runner executes offline checks only", () => {
  assert.doesNotThrow(() => runPhase4ReadinessChecks());
});
