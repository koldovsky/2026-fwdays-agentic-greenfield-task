// Git commit-msg hook — enforce the OpenSpec flow so every feature commit is
// linkable to a real change (not just a bare FR id).
//
// Rule: a commit that touches feature code (app/, lib/, db/, src/) must EITHER
//   - carry a `Slice: add-<capability>` trailer that RESOLVES to an OpenSpec
//     change under openspec/changes/<slice> (active) or openspec/changes/
//     archive/*-<slice> (archived); or
//   - be a bug fix, carrying a `Refs: BUG-<n>` trailer.
// A `Refs: FR-…` trailer alone is NOT sufficient — feature work goes through an
// OpenSpec change, so `Slice:` must point at one. Docs/test/chore commits (no
// feature code) are exempt. This makes `git log --grep` a complete audit trail
// AND guarantees the spec/change exists before the code that implements it.
import { execSync } from "node:child_process";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const msgFile = process.argv[2];
const msg = readFileSync(msgFile, "utf8");

const staged = execSync("git diff --cached --name-only", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);
const touchesFeatureCode = staged.some(
  (f) => /^(app|lib|db|src)\//.test(f) && !/\.(test|spec)\./.test(f),
);
if (!touchesFeatureCode) process.exit(0);

// Ids may be plain (FR-12) or categorized (FR-SHELL-01, NFR-A11Y-02).
const refMatch = msg.match(
  /^Refs:\s*((?:FR|NFR|TC|BC|BUG)-(?:[A-Z0-9]+-)?\d+(?:,\s*(?:FR|NFR|TC|BC|BUG)-(?:[A-Z0-9]+-)?\d+)*)\s*$/m,
);
const refIds = refMatch ? refMatch[1].split(/,\s*/) : [];
const hasBugRef = refIds.some((id) => id.startsWith("BUG-"));

const sliceMatch = msg.match(/^Slice:\s*([a-z0-9-]+)\s*$/m);
const slice = sliceMatch ? sliceMatch[1] : null;

// Bug fixes may go straight to code with a BUG ref (uat-triage flow).
if (hasBugRef) process.exit(0);

const CHANGES_DIR = "openspec/changes";
function sliceResolves(name) {
  if (existsSync(join(CHANGES_DIR, name))) return true; // active change
  const archive = join(CHANGES_DIR, "archive");
  if (!existsSync(archive)) return false;
  return readdirSync(archive).some(
    (dir) => dir === name || dir.endsWith(`-${name}`),
  );
}

if (!slice) {
  console.error(
    [
      "commit-msg: this commit touches feature code but has no `Slice:` trailer.",
      "Feature work goes through an OpenSpec change. Add to the commit body:",
      "  Slice: add-<capability>",
      "  Refs: FR-12, FR-13",
      "(For a UAT bug fix instead, use `Refs: BUG-<n>`.)",
    ].join("\n"),
  );
  process.exit(1);
}

if (!sliceResolves(slice)) {
  console.error(
    [
      `commit-msg: \`Slice: ${slice}\` does not resolve to an OpenSpec change.`,
      `Author it first (openspec/changes/${slice}/ with proposal.md + specs + tasks.md),`,
      "then commit. Never bypass with --no-verify — the change must exist before its code.",
    ].join("\n"),
  );
  process.exit(1);
}

process.exit(0);
