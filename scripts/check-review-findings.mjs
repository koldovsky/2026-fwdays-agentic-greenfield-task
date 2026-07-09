#!/usr/bin/env node
// Validates review-findings.json artifacts against the shared contract.
// Zero external deps: Node built-ins only.
//
// Discovers:
//   - openspec/changes/**/review-findings.json
//   - .claude/reviews/**/*.json
//
// Usage: node scripts/check-review-findings.mjs
// Exit code: 0 if every discovered file is valid (or none found), 1 otherwise.

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = process.cwd();
const OPENSPEC_CHANGES_DIR = join(repoRoot, "openspec", "changes");
const CLAUDE_REVIEWS_DIR = join(repoRoot, ".claude", "reviews");

const VALID_SEVERITIES = new Set(["blocker", "major", "minor"]);
const VALID_VERDICTS = new Set(["ship", "fix-first"]);
const REQUIRED_TOP_LEVEL_KEYS = [
  "change",
  "reviewer",
  "date",
  "verdict",
  "blockers",
  "majors",
  "minors",
  "findings",
];

/**
 * Recursively walk a directory, returning absolute paths of files that
 * satisfy `predicate(absolutePath, entryName)`. Silently returns an empty
 * array if `dir` does not exist.
 */
function walk(dir, predicate) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const found = [];
  for (const entry of entries) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(abs, predicate));
    } else if (entry.isFile() && predicate(abs, entry.name)) {
      found.push(abs);
    }
  }
  return found;
}

function discoverFiles() {
  const fromOpenspec = walk(
    OPENSPEC_CHANGES_DIR,
    (_abs, name) => name === "review-findings.json"
  );
  const fromClaudeReviews = walk(
    CLAUDE_REVIEWS_DIR,
    (_abs, name) => name.endsWith(".json")
  );

  // Dedupe in case both roots somehow resolve to the same file.
  return Array.from(new Set([...fromOpenspec, ...fromClaudeReviews]));
}

/**
 * Hand-validates the review-findings shape (mirrors
 * .claude/review-findings.schema.json). Returns an array of human-readable
 * error strings; empty array means valid.
 */
function validateShape(data) {
  const errors = [];

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return ["root value must be a JSON object"];
  }

  for (const key of REQUIRED_TOP_LEVEL_KEYS) {
    if (!(key in data)) {
      errors.push(`missing required key "${key}"`);
    }
  }

  if ("change" in data && typeof data.change !== "string") {
    errors.push('"change" must be a string');
  }
  if ("reviewer" in data && typeof data.reviewer !== "string") {
    errors.push('"reviewer" must be a string');
  }
  if ("date" in data && typeof data.date !== "string") {
    errors.push('"date" must be a string');
  }
  if ("commit" in data && typeof data.commit !== "string") {
    errors.push('"commit" must be a string');
  }

  if ("verdict" in data) {
    if (typeof data.verdict !== "string" || !VALID_VERDICTS.has(data.verdict)) {
      errors.push(
        `"verdict" must be one of ${[...VALID_VERDICTS].join("|")}, got ${JSON.stringify(
          data.verdict
        )}`
      );
    }
  }

  for (const key of ["blockers", "majors", "minors"]) {
    if (key in data && typeof data[key] !== "number") {
      errors.push(`"${key}" must be a number`);
    }
  }

  if ("requirementIds" in data) {
    if (!Array.isArray(data.requirementIds)) {
      errors.push('"requirementIds" must be an array');
    } else {
      data.requirementIds.forEach((id, i) => {
        if (typeof id !== "string") {
          errors.push(`"requirementIds[${i}]" must be a string`);
        }
      });
    }
  }

  if ("findings" in data) {
    if (!Array.isArray(data.findings)) {
      errors.push('"findings" must be an array');
    } else {
      data.findings.forEach((finding, i) => {
        if (typeof finding !== "object" || finding === null || Array.isArray(finding)) {
          errors.push(`findings[${i}] must be an object`);
          return;
        }

        if (
          typeof finding.severity !== "string" ||
          !VALID_SEVERITIES.has(finding.severity)
        ) {
          errors.push(
            `findings[${i}].severity must be one of ${[...VALID_SEVERITIES].join(
              "|"
            )}, got ${JSON.stringify(finding.severity)}`
          );
        }

        if (typeof finding.problem !== "string" || finding.problem.trim() === "") {
          errors.push(`findings[${i}].problem must be a non-empty string`);
        }

        if (typeof finding.fix !== "string" || finding.fix.trim() === "") {
          errors.push(`findings[${i}].fix must be a non-empty string`);
        }

        if ("path" in finding && typeof finding.path !== "string") {
          errors.push(`findings[${i}].path must be a string`);
        }
        if ("line" in finding && typeof finding.line !== "number") {
          errors.push(`findings[${i}].line must be a number`);
        }
        if ("requirement" in finding && typeof finding.requirement !== "string") {
          errors.push(`findings[${i}].requirement must be a string`);
        }
        if ("status" in finding) {
          if (
            typeof finding.status !== "string" ||
            !["open", "fixed"].includes(finding.status)
          ) {
            errors.push(
              `findings[${i}].status must be one of open|fixed, got ${JSON.stringify(
                finding.status
              )}`
            );
          }
        }
      });
    }
  }

  return errors;
}

function main() {
  const files = discoverFiles();

  if (files.length === 0) {
    console.log("no review-findings files found (ok)");
    process.exit(0);
  }

  let anyInvalid = false;
  const results = [];

  for (const absPath of files) {
    const relPath = relative(repoRoot, absPath);
    let raw;
    try {
      raw = readFileSync(absPath, "utf8");
    } catch (err) {
      anyInvalid = true;
      results.push({ relPath, ok: false, errors: [`failed to read file: ${err.message}`] });
      continue;
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      anyInvalid = true;
      results.push({ relPath, ok: false, errors: [`invalid JSON: ${err.message}`] });
      continue;
    }

    const errors = validateShape(data);
    if (errors.length > 0) {
      anyInvalid = true;
      results.push({ relPath, ok: false, errors });
    } else {
      results.push({ relPath, ok: true, errors: [] });
    }
  }

  console.log(`Checked ${files.length} review-findings file(s):\n`);
  for (const result of results) {
    if (result.ok) {
      console.log(`  PASS  ${result.relPath}`);
    } else {
      console.log(`  FAIL  ${result.relPath}`);
      for (const err of result.errors) {
        console.log(`          - ${err}`);
      }
    }
  }

  const passCount = results.filter((r) => r.ok).length;
  const failCount = results.length - passCount;
  console.log(`\nTotal: ${results.length} checked, ${passCount} passed, ${failCount} failed.`);

  process.exit(anyInvalid ? 1 : 0);
}

main();
