import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
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
  assertDeployedApiEntrypointContracts,
  assertDeploymentSurface,
  assertEnvExampleMatchesCode,
  assertHealthEntrypointContract,
  assertNitroDependencyLocked,
  assertClientBundleFreeOfServerOnlyModules,
  assertNitroOutputSurface,
  assertPreviewOnlyProbeEntrypointContract,
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

test("deployment config parses the documented safe env examples and retains the Nitro-owned Vercel footprint", () => {
  assertViteConfigParses();
  assertNitroDependencyLocked();
  assertEnvExampleMatchesCode();
  assertHealthEntrypointContract();
  assertDeployedApiEntrypointContracts();
  assertPreviewOnlyProbeEntrypointContract();

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
    REDIS_KEY_NAMESPACE: "email-shadow-panel-local",
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

  assert.equal(sessionCore.sessionTtlMs, 900_000);
  assert.equal(upstash.namespace, "email-shadow-panel-local");
  assert.equal(publicConfig.providerEnabled, true);
  assert.equal(publicConfig.operationLockTtlMs, 15_000);
  assert.equal(publicConfig.activeInboxReservationTtlMs, 15_000);
  assert.equal(footprint.nitroApiRouteCount, 4);
  assert.equal(footprint.legacyRootApiEntryCount, 0);
});

test("the Phase 0 probe stays blocked in production and remains server-only", async () => {
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

test("health Nitro route is standalone and avoids server-only imports", () => {
  const healthRoute = readFileSync(resolve(process.cwd(), "src/routes/api/health.ts"), "utf8");

  assertHealthEntrypointContract();
  assert.match(healthRoute, /createFileRoute\(["']\/api\/health["']\)/u);
  assert.doesNotMatch(
    healthRoute,
    /createPublicApiHandlers|createProductionPublicApiDependencies|loadPublicApiConfig|server\/api|\.server\.|process\.env/u,
  );
  assert.match(healthRoute, /"Cache-Control": "no-store"/u);
  assert.match(healthRoute, /"Content-Type": "application\/json; charset=utf-8"/u);
  assert.match(healthRoute, /createHealthResponse\(true\)/u);
  assert.match(healthRoute, /createHealthResponse\(false\)/u);
  assert.match(healthRoute, /GET:/u);
  assert.match(healthRoute, /HEAD:/u);
  assert.match(healthRoute, /ANY:/u);
});

test("Nitro API routes own the public API surface and the legacy root /api files are absent", () => {
  assertDeployedApiEntrypointContracts();
  assertPreviewOnlyProbeEntrypointContract();

  for (const legacyPath of [
    "api/health.ts",
    "api/inboxes.ts",
    "api/inboxes/messages.ts",
    "api/inboxes/messages/[messageReference].ts",
    "api/_probe/emailnator.ts",
  ]) {
    assert.equal(
      existsSync(resolve(process.cwd(), legacyPath)),
      false,
      `${legacyPath} should be absent.`,
    );
  }

  for (const nitroPath of [
    "src/routes/api/health.ts",
    "src/routes/api/inboxes.ts",
    "src/routes/api/inboxes/messages.ts",
    "src/routes/api/inboxes/messages/$messageReference.ts",
  ]) {
    assert.equal(existsSync(resolve(process.cwd(), nitroPath)), true, `${nitroPath} should exist.`);
  }
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

test("deployment docs describe the Nitro-owned API surface and the updated deployed footprint", () => {
  const deploymentDocs = readFileSync(
    resolve(process.cwd(), "docs/runbooks/deployment.md"),
    "utf8",
  );
  const phase4VerificationDocs = readFileSync(
    resolve(process.cwd(), "docs/verification/phase-4.md"),
    "utf8",
  );

  assert.match(deploymentDocs, /Nitro-owned public API routes/u);
  assert.match(deploymentDocs, /src\/routes\/api/u);
  assert.match(deploymentDocs, /deployed Vercel function count remains provisional/u);
  assert.match(phase4VerificationDocs, /Nitro-owned .*public API surface/u);
  assert.match(phase4VerificationDocs, /legacy root API entries/u);
});

test("Phase 4 verifier targets Nitro public output and keeps the server boundary separate", () => {
  const verifyPhase4Source = readFileSync(
    resolve(process.cwd(), "scripts/verify-phase4.ts"),
    "utf8",
  );

  assert.ok(
    verifyPhase4Source.includes('const clientBundleRoot = resolve(projectRoot, ".output/public")'),
  );
  assert.ok(
    verifyPhase4Source.includes('const nitroServerEntry = resolve(nitroRoot, "server/index.mjs")'),
  );
  assert.ok(verifyPhase4Source.includes('const nitroManifest = resolve(nitroRoot, "nitro.json")'));
  assert.ok(verifyPhase4Source.includes("assertNitroOutputSurface(projectRoot)"));
  assert.ok(verifyPhase4Source.includes("assertClientBundleFreeOfServerOnlyModules(projectRoot)"));
  assert.ok(verifyPhase4Source.includes("assertPhase4PostBuildVerification()"));
  assert.ok(verifyPhase4Source.includes("assertHealthEntrypointContract()"));
  assert.ok(verifyPhase4Source.includes("assertDeployedApiEntrypointContracts()"));
  assert.ok(verifyPhase4Source.includes("assertPreviewOnlyProbeEntrypointContract()"));
  assert.ok(verifyPhase4Source.includes("The Nitro public output is missing."));
  assert.ok(verifyPhase4Source.includes("The Nitro server entry is missing."));
  assert.ok(
    verifyPhase4Source.includes(
      "The Nitro route surface should contain four public API route files.",
    ),
  );
  assert.ok(
    verifyPhase4Source.includes(
      "The legacy root /api Vercel Function entries should be absent now that Nitro owns the public API routes.",
    ),
  );
  assert.ok(!verifyPhase4Source.includes("dist/client"));
  assert.ok(
    !verifyPhase4Source.includes(
      'const clientBundleRoot = resolve(PROJECT_ROOT, ".output/server")',
    ),
  );
});

test("post-build Nitro artifact assertions still require output and scan only client assets", () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "phase4-verifier-"));
  const outputRoot = join(tempRoot, ".output");
  const publicAssetsRoot = join(outputRoot, "public", "assets");
  const serverRoot = join(outputRoot, "server");

  assert.throws(
    () => assertNitroOutputSurface(tempRoot),
    /The Nitro output directory is missing./u,
  );

  mkdirSync(publicAssetsRoot, { recursive: true });
  mkdirSync(serverRoot, { recursive: true });

  assert.throws(() => assertNitroOutputSurface(tempRoot), /The Nitro server entry is missing./u);

  writeFileSync(join(serverRoot, "index.mjs"), "export default {}\n", "utf8");
  assert.throws(() => assertNitroOutputSurface(tempRoot), /The Nitro manifest is missing./u);

  writeFileSync(join(outputRoot, "nitro.json"), "{}\n", "utf8");
  assert.throws(() => assertNitroOutputSurface(tempRoot), /The Nitro public output is empty./u);

  writeFileSync(join(publicAssetsRoot, "client.js"), "console.log('safe');\n", "utf8");
  assert.doesNotThrow(() => assertNitroOutputSurface(tempRoot));

  writeFileSync(
    join(serverRoot, "index.mjs"),
    "console.log('server/api/composition-root.server.ts');\n",
    "utf8",
  );
  assert.doesNotThrow(() => assertClientBundleFreeOfServerOnlyModules(tempRoot));

  writeFileSync(
    join(publicAssetsRoot, "client.js"),
    "console.log('server/api/composition-root.server.ts');\n",
    "utf8",
  );
  assert.throws(() => assertClientBundleFreeOfServerOnlyModules(tempRoot), /server-only pattern/u);
});

test("server-only modules remain lazily wired in source and the health route is standalone", () => {
  const healthRoute = readFileSync(resolve(process.cwd(), "src/routes/api/health.ts"), "utf8");
  const compositionRoot = readFileSync(
    resolve(process.cwd(), "server/api/composition-root.server.ts"),
    "utf8",
  );
  const verifyPhase4Source = readFileSync(
    resolve(process.cwd(), "scripts/verify-phase4.ts"),
    "utf8",
  );

  assert.doesNotMatch(
    healthRoute,
    /createPublicApiHandlers|createProductionPublicApiDependencies|loadPublicApiConfig|server\/api|\.server\.|process\.env/u,
  );
  assert.match(compositionRoot, /createProductionPublicApiDependencies/u);
  assert.match(compositionRoot, /loadPublicApiConfig/u);
  assert.match(verifyPhase4Source, /assertHealthEntrypointContract\(\)/u);
  assert.match(verifyPhase4Source, /assertDeployedApiEntrypointContracts\(\)/u);
  assert.match(verifyPhase4Source, /assertPreviewOnlyProbeEntrypointContract\(\)/u);
  assert.ok(!existsSync(resolve(process.cwd(), "api/health.ts")));
  assert.ok(!existsSync(resolve(process.cwd(), "api/inboxes.ts")));
  assert.ok(!existsSync(resolve(process.cwd(), "api/inboxes/messages.ts")));
  assert.ok(!existsSync(resolve(process.cwd(), "api/inboxes/messages/[messageReference].ts")));
  assert.ok(!existsSync(resolve(process.cwd(), "api/_probe/emailnator.ts")));
});

test("the readiness runner executes offline checks only", () => {
  assert.doesNotThrow(() => runPhase4ReadinessChecks());
});
