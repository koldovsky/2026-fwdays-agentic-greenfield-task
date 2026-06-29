#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parsePlan } from "./lib/parse.js";
import { scoreChanges } from "./lib/score.js";
import { summarize } from "./lib/summarize.js";

const HELP = `tf-guard — risk-rank a terraform plan.

Usage:
  terraform plan -out plan.bin && terraform show -json plan.bin | tf-guard
  tf-guard <plan.json> [--json]

Options:
  --json     Emit the machine-readable report instead of text.
  -h, --help Show this help.

Exit code: 1 when any finding is high risk (so CI can gate), else 0.`;

function readInput(file: string | undefined): string {
  if (file === undefined || file === "-") return readFileSync(0, "utf8"); // fd 0 = stdin
  return readFileSync(file, "utf8");
}

function main(argv: string[]): number {
  const args = argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    console.log(HELP);
    return 0;
  }
  const asJson = args.includes("--json");
  const file = args.find((a) => !a.startsWith("-"));

  let raw: string;
  try {
    raw = readInput(file);
  } catch {
    console.error(`tf-guard: cannot read input${file ? ` '${file}'` : " from stdin"}`);
    return 2;
  }

  let report;
  try {
    report = summarize(scoreChanges(parsePlan(JSON.parse(raw))));
  } catch (err) {
    console.error(`tf-guard: ${err instanceof Error ? err.message : String(err)}`);
    return 2;
  }

  console.log(asJson ? JSON.stringify(report.json, null, 2) : report.text);
  return report.json.highRiskCount > 0 ? 1 : 0; // BC-EXIT-01
}

process.exit(main(process.argv));
