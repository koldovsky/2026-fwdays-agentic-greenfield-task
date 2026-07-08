import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

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

function walkDirectories(entryPath: string): string[] {
  const stat = statSync(entryPath);
  if (stat.isDirectory()) {
    return [
      entryPath,
      ...readdirSync(entryPath).flatMap((child) => walkDirectories(resolve(entryPath, child))),
    ];
  }

  return [];
}

function readTextFile(absolutePath: string): string {
  return readFileSync(absolutePath, "utf8");
}

function assertBundleContainsRoute(
  bundleText: string,
  routePattern: RegExp | string,
  label: string,
): void {
  const routeRegex =
    typeof routePattern === "string"
      ? new RegExp(routePattern.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u")
      : routePattern;
  assert.ok(routeRegex.test(bundleText), `The Vercel Nitro server bundle is missing ${label}.`);
}

export interface VercelPresetOutputSurface {
  functionCount: number;
  functionNames: string[];
  frameworkName?: string;
  frameworkVersion?: string;
}

export function assertVercelPresetOutputSurface(
  projectRoot = process.cwd(),
): VercelPresetOutputSurface {
  const vercelRoot = resolve(projectRoot, ".vercel/output");
  const configPath = resolve(vercelRoot, "config.json");
  const functionsRoot = resolve(vercelRoot, "functions");
  const serverFunctionRoot = resolve(functionsRoot, "__server.func");
  const serverEntry = resolve(serverFunctionRoot, "index.mjs");

  assert.ok(existsSync(vercelRoot), "The Vercel output directory is missing.");
  assert.ok(existsSync(configPath), "The Vercel build output config is missing.");
  assert.ok(existsSync(functionsRoot), "The Vercel functions directory is missing.");
  assert.ok(existsSync(serverFunctionRoot), "The Nitro Vercel server function is missing.");
  assert.ok(existsSync(serverEntry), "The Nitro Vercel server entry is missing.");

  const config = JSON.parse(readFileSync(configPath, "utf8")) as {
    version?: number;
    framework?: { name?: string; version?: string };
    routes?: Array<{ handle?: string; src?: string; dest?: string }>;
  };
  assert.equal(config.version, 3, "The Vercel build output must use version 3.");
  assert.ok(config.framework?.name, "The Vercel build output is missing a framework name.");
  assert.ok(config.framework?.version, "The Vercel build output is missing a framework version.");
  assert.ok(Array.isArray(config.routes), "The Vercel build output routes array is missing.");

  const functionDirs = walkDirectories(functionsRoot)
    .filter((dirPath) => dirPath.endsWith(".func"))
    .map((dirPath) => relative(vercelRoot, dirPath).replace(/\\/g, "/"))
    .sort((left, right) => left.localeCompare(right));
  assert.deepEqual(
    functionDirs,
    [
      "functions/__server.func",
      "functions/api/health.func",
      "functions/api/inboxes.func",
      "functions/api/inboxes/messages.func",
      "functions/api/inboxes/messages/[messageReference].func",
    ],
    "The Vercel preset should generate the Nitro SSR function plus the four public API functions.",
  );

  const routes = config.routes ?? [];
  assert.ok(
    routes.some((route) => route.handle === "filesystem"),
    "The Vercel build output must keep a filesystem route handle.",
  );
  assert.ok(
    routes.some((route) => route.dest === "/__server"),
    "The Vercel build output must fall back to the Nitro server function.",
  );
  assert.equal(
    routes.at(-1)?.dest,
    "/__server",
    "The final Vercel fallback route should target the Nitro server function.",
  );

  const routeSources = routes.map((route) => route.src ?? "");
  const apiRouteSourcePatterns = [
    { label: "health route", pattern: /\/api\/health/u },
    { label: "inboxes route", pattern: /\/api\/inboxes/u },
    { label: "messages route", pattern: /\/api\/inboxes\/messages/u },
    {
      label: "dynamic message route",
      pattern:
        /\/api\/inboxes\/messages\/(?:\(\?<messageReference>\[\^\/\]\+\)|:messageReference|\[messageReference\]|\$messageReference)/u,
    },
  ] as const;
  const fallbackIndex = routes.findIndex((route) => route.dest === "/__server");
  assert.ok(fallbackIndex !== -1, "The Vercel build output is missing the Nitro fallback route.");
  for (const { label, pattern } of apiRouteSourcePatterns) {
    const routeIndex = routes.findIndex((route) => pattern.test(route.src ?? ""));
    assert.ok(routeIndex !== -1, `The Vercel build output is missing ${label}.`);
    assert.ok(
      routeIndex < fallbackIndex,
      `The Vercel build output must register ${label} before the Nitro fallback route.`,
    );
    assert.ok(
      routeSources.some((src) => pattern.test(src)),
      `The Vercel build output is missing ${label}.`,
    );
  }

  const bundleText = readTextFile(serverEntry);
  assertBundleContainsRoute(bundleText, "/api/health", "the health route");
  assertBundleContainsRoute(bundleText, "/api/inboxes", "the inbox route");
  assertBundleContainsRoute(bundleText, "/api/inboxes/messages", "the messages route");
  assertBundleContainsRoute(
    bundleText,
    /\/api\/inboxes\/messages(?:\/(?:\(\?<messageReference>\[\^\/\]\+\)|:messageReference|\[messageReference\]|\$messageReference))?/u,
    "the dynamic message route",
  );
  assert.doesNotMatch(
    bundleText,
    /server\/api\/composition-root\.server\.ts|src\/routes\/api|api\/_probe\/emailnator/u,
    "The Vercel server bundle must not reference unresolved source files or the probe route.",
  );

  return {
    functionCount: functionDirs.length,
    functionNames: functionDirs,
    frameworkName: config.framework?.name,
    frameworkVersion: config.framework?.version,
  };
}

const isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href;

if (isMain) {
  const footprint = assertVercelPresetOutputSurface();
  console.log(`Vercel preset output verified. Functions: ${footprint.functionNames.join(", ")}.`);
}
