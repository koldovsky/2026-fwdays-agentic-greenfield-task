// PD-1 red->green proof: a `dropped` requirement must not be counted as an MVP
// obligation. Both check-traceability and check-acceptance-methods detected only
// `| Future |` as non-MVP, so a dropped negative requirement (FR-NACE-06,
// FR-INPUT-03) was demanded to carry tests, recordings, and a verification tag —
// none of which a satisfied-by-omission requirement can honestly have.
//
// Run: node tests/check-dropped-status.test.mjs
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const TRACE = resolve("scripts/check-traceability.mjs");
const ACCEPT = resolve("scripts/check-acceptance-methods.mjs");
const FIXTURE = resolve("tests/.gate-fixtures/pd-1");

function run(script, args) {
  const dir = mkdtempSync(join(tmpdir(), "pd-1-"));
  try {
    cpSync(FIXTURE, dir, { recursive: true });
    const r = spawnSync(process.execPath, [script, ...args], { cwd: dir, encoding: "utf8" });
    return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const checks = [];
const check = (name, actual, expected) => {
  const ok = actual === expected;
  checks.push({ name, ok });
  console.log(`${ok ? "ok  " : "FAIL"} ${name}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
};

// check-traceability: the dropped FR must not be demanded a test or a recording,
// and must not be counted among the MVP FRs. Only FR-CALC-01 is MVP.
const trace = run(TRACE, []);
check("traceability: dropped FR not demanded a test", /FR-NACE-06 has no test annotated/.test(trace.out), false);
check("traceability: counts only the 1 real MVP FR", /1 MVP FRs? checked/.test(trace.out), true);
check("traceability: real MVP FR still audited", /FR-CALC-01/.test(trace.out) || trace.code === 0, true);

// check-acceptance-methods --mode=existence: the dropped FR must not be flagged
// as an untagged MVP requirement.
const accept = run(ACCEPT, ["--mode=existence"]);
check("acceptance: dropped FR not flagged untagged", /untagged:\s*FR-NACE-06/.test(accept.out), false);
check("acceptance: real tagged MVP FR is not flagged", /untagged:\s*FR-CALC-01/.test(accept.out), false);

const failed = checks.filter((c) => !c.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
