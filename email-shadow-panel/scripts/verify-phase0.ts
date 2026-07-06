import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_FILES = [
  "api/_probe/emailnator.ts",
  "server/providers/emailnator/provider.server.ts",
  "server/providers/emailnator/probe.server.ts",
  "tests/fixtures/emailnator/README.md",
  "docs/verification/phase-0.md",
  "docs/agentic-process.md",
  "docs/adr/001-vercel-http-adapter.md",
  ".env.example",
];

const SENSITIVE_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "provider session cookie value", pattern: /gmailnator_session=(?!redacted)[^;\s]+/i },
  { name: "provider xsrf cookie value", pattern: /XSRF-TOKEN=(?!redacted)[^;\s]+/i },
  { name: "bearer token literal", pattern: /Authorization:\s*Bearer\s+[A-Za-z0-9._-]{12,}/i },
];

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

for (const relativePath of REQUIRED_FILES) {
  const absolutePath = resolve(process.cwd(), relativePath);
  try {
    statSync(absolutePath);
  } catch {
    throw new Error(`Missing required Phase 0 artifact: ${relativePath}`);
  }
}

for (const relativePath of [
  "docs",
  "tests/fixtures/emailnator",
  "server/providers/emailnator",
  ".env.example",
]) {
  const absolutePath = resolve(process.cwd(), relativePath);
  for (const filePath of walkFiles(absolutePath)) {
    const fileText = readFileSync(filePath, "utf8");
    for (const { name, pattern } of SENSITIVE_PATTERNS) {
      if (pattern.test(fileText)) {
        throw new Error(`Sensitive pattern detected in ${filePath}: ${name}`);
      }
    }
  }
}

console.log("Phase 0 artifact and sensitive-value checks passed.");
