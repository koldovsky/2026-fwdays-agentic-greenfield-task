import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_FILES = [
  "server/providers/inbox-provider.server.ts",
  "server/providers/emailnator/inbox-provider.server.ts",
  "server/session/contracts.server.ts",
  "server/session/service.server.ts",
  "server/session/in-memory-session-repository.server.ts",
  "server/session/upstash-session-repository.server.ts",
  "tests/phase1/session-service.test.ts",
  "tests/phase1/upstash-session-repository.test.ts",
  "docs/tasks/phase-1-production-provider-session-core.md",
  "docs/verification/phase-1.md",
  "docs/agentic-process.md",
  ".env.example",
];

const SENSITIVE_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  {
    name: "provider session cookie value",
    pattern: /gmailnator_session=(?!redacted)[^;\s]+/i,
  },
  {
    name: "provider xsrf cookie value",
    pattern: /XSRF-TOKEN=(?!redacted)[^;\s]+/i,
  },
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
    throw new Error(`Missing required Phase 1 artifact: ${relativePath}`);
  }
}

for (const relativePath of [
  "docs",
  "server/session",
  "server/providers/emailnator",
  ".env.example",
]) {
  const absolutePath = resolve(process.cwd(), relativePath);
  for (const filePath of walkFiles(absolutePath)) {
    const fileText = readFileSync(filePath, "utf8");
    for (const { name, pattern } of SENSITIVE_PATTERNS) {
      if (pattern.test(fileText) && !filePath.endsWith("verify-phase1.ts")) {
        throw new Error(`Sensitive pattern detected in ${filePath}: ${name}`);
      }
    }
  }
}

console.log("Phase 1 artifact and sensitive-value checks passed.");
