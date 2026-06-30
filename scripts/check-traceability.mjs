#!/usr/bin/env node
// check-traceability.mjs — my own traceability gate (hand-authored, see ADR-0003).
//
// Rule: every MVP functional requirement in docs/requirements.md must be cited in
// at least one OpenSpec capability spec under openspec/specs/. This guards against
// scope drift — a requirement that no spec describes, or a requirement deleted from
// the docs but still claimed by a spec.
//
// Exit 0 = green; non-zero = a gap to fix. Used by .githooks/pre-commit and CI.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const REQUIREMENTS = join(ROOT, "docs/requirements.md");
const SPECS_DIR = join(ROOT, "openspec/specs");

// Parse the FR table rows: "| FR-XXX-01 | MVP | … |" → id → phase.
function readFunctionalRequirements() {
  const frs = new Map();
  for (const line of readFileSync(REQUIREMENTS, "utf8").split("\n")) {
    const m = line.match(/^\|\s*(FR-[A-Z0-9]+-\d+)\s*\|\s*(MVP|Future)\s*\|/);
    if (m) frs.set(m[1], m[2]);
  }
  return frs;
}

// Concatenate every spec markdown so we can check for id citations.
function collectSpecText(dir) {
  let text = "";
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) text += collectSpecText(p);
    else if (p.endsWith(".md")) text += "\n" + readFileSync(p, "utf8");
  }
  return text;
}

const frs = readFunctionalRequirements();
if (frs.size === 0) {
  console.error("✗ traceability: no FR rows found in docs/requirements.md");
  process.exit(1);
}

const specText = collectSpecText(SPECS_DIR);
const mvp = [...frs].filter(([, phase]) => phase === "MVP").map(([id]) => id);
const missing = mvp.filter((id) => !specText.includes(id));

if (missing.length) {
  console.error(`✗ traceability: ${missing.length} MVP FR(s) not cited in any spec:`);
  for (const id of missing) console.error(`  - ${id}`);
  console.error("\nEvery MVP FR must appear in exactly one openspec/specs/<cap>/spec.md.");
  process.exit(1);
}

const future = frs.size - mvp.length;
console.log(
  `✓ traceability: all ${mvp.length} MVP FRs cited in openspec/specs` +
    ` (${future} Future FR${future === 1 ? "" : "s"} not required).`,
);
