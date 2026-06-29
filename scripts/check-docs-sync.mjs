#!/usr/bin/env node
// Guardrail against doc drift — the boring sync that humans forget. Run with --check
// in pre-push / CI; exits 1 (and prints every problem) if anything is out of sync.
//
// Checks (all validate-only — nothing is auto-generated here, so we fail loudly):
//   1. ADR index: every docs/adr/NNNN-*.md has exactly one row in docs/adr/README.md,
//      and every README row links to a file that exists.
//   2. package.json scripts are documented in AGENTS.md "## Commands" (so a script can't
//      land without a doc entry — the manual step we keep forgetting). `prepare` is exempt
//      (husky plumbing, not a user-facing command).
//
// Usage:
//   node scripts/check-docs-sync.mjs           report problems (exit 0 always)
//   node scripts/check-docs-sync.mjs --check   exit 1 if anything is out of sync

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, '..');
const check = process.argv.includes('--check');

const problems = [];
const fail = (msg) => problems.push(msg);
const read = (rel) => readFileSync(join(repoRoot, rel), 'utf8');

// --- 1. ADR index <-> ADR files ------------------------------------------
const adrDir = join(repoRoot, 'docs/adr');
const adrFiles = readdirSync(adrDir)
  .filter((f) => /^\d{4}-.*\.md$/.test(f))
  .sort();

const readme = read('docs/adr/README.md');
// Links look like: [0009](./0009-eslint-prettier-lint-format.md)
const linkedFiles = new Set([...readme.matchAll(/\]\(\.\/(\d{4}-[^)]+\.md)\)/g)].map((m) => m[1]));

for (const file of adrFiles) {
  if (!linkedFiles.has(file)) {
    fail(`ADR index: docs/adr/${file} exists but has no row in docs/adr/README.md`);
  }
}
for (const linked of linkedFiles) {
  if (!existsSync(join(adrDir, linked))) {
    fail(`ADR index: docs/adr/README.md links ${linked} but that file does not exist`);
  }
}

// --- 2. package.json scripts documented in AGENTS.md ---------------------
const EXEMPT_SCRIPTS = new Set(['prepare']);
const pkg = JSON.parse(read('package.json'));
const agents = read('AGENTS.md');

for (const name of Object.keys(pkg.scripts ?? {})) {
  if (EXEMPT_SCRIPTS.has(name)) {
    continue;
  }
  // Accept either `npm run <name>` or `npm <name>` (e.g. `npm test`) anywhere in AGENTS.md.
  const documented = agents.includes(`npm run ${name}`) || agents.includes(`npm ${name}`);
  if (!documented) {
    fail(`AGENTS.md: package.json script "${name}" is not documented in the Commands section`);
  }
}

// --- report --------------------------------------------------------------
if (problems.length === 0) {
  console.log('docs sync: OK');
  process.exit(0);
}

console.error(`docs sync: ${problems.length} problem(s) found:`);
for (const p of problems) {
  console.error(`  - ${p}`);
}
process.exit(check ? 1 : 0);
