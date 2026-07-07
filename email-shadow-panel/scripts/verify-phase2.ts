import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_FILES = [
  "src/routes/api/health.ts",
  "src/routes/api/inboxes.ts",
  "src/routes/api/inboxes/messages.ts",
  "src/routes/api/inboxes/messages/$messageReference.ts",
  "server/api/contracts.server.ts",
  "server/api/handlers.server.ts",
  "server/api/composition-root.server.ts",
  "tests/phase2/public-api.test.ts",
  "tests/phase2/abuse-controls.test.ts",
  "docs/tasks/phase-2-public-api-abuse-protection.md",
  "docs/verification/phase-2.md",
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
  {
    name: "bearer token literal",
    pattern: /Authorization:\s*Bearer\s+[A-Za-z0-9._-]{20,}/i,
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
    throw new Error(`Missing required Phase 2 artifact: ${relativePath}`);
  }
}

for (const relativePath of ["docs", "server/api", "tests/phase2", ".env.example"]) {
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

console.log("Phase 2 artifact and sensitive-value checks passed.");
