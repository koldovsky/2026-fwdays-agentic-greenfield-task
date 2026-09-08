import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const REQUIRED_FILES = [
  "src/lib/inboxApiClient.ts",
  "src/lib/inboxController.ts",
  "src/lib/localSessions.ts",
  "src/lib/safeMessageText.ts",
  "tests/phase3/api-client.test.ts",
  "tests/phase3/inbox-controller.test.ts",
  "tests/phase3/local-sessions.test.ts",
  "tests/phase3/polling.test.ts",
  "tests/phase3/rendering-safety.test.ts",
  "tests/phase3/otp.test.ts",
  "docs/tasks/phase-3-frontend-integration.md",
  "docs/verification/phase-3.md",
  "docs/agentic-process.md",
  "package.json",
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
    name: "captured bearer token header",
    pattern: /Authorization:\s*Bearer\s+[A-Za-z0-9._-]{20,}/i,
  },
];

const SENSITIVE_SCAN_TARGETS = [
  "src",
  "tests/phase3",
  "docs/tasks/phase-3-frontend-integration.md",
  "docs/verification/phase-3.md",
  "docs/agentic-process.md",
  "package.json",
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
    throw new Error(`Missing required Phase 3 artifact: ${relativePath}`);
  }
}

for (const relativePath of SENSITIVE_SCAN_TARGETS) {
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

console.log("Phase 3 artifact and sensitive-value checks passed.");
