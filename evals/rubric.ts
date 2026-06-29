import type { Finding } from "../src/lib/types.js";
import type { Report } from "../src/lib/summarize.js";
import { summarizeFinding } from "../src/lib/summarize.js";

export interface Check {
  id: string;
  pass: boolean;
}

const BANNED_FOR_HIGH = /\b(safe|ok|fine)\b/i;

/**
 * Grade a generated report against the output rubric (FR-OUT-02 and consistency).
 * This is an *eval*, not a test: many wordings are valid, so we score properties of
 * the summary rather than exact strings. Swap-in point for an LLM judge is documented
 * in evals/run.ts; the shipped judge is deterministic so it runs keyless in CI.
 */
/** The tool-generated reason is everything after the " — " separator (the address,
 * which the user controls, comes before it and must not be scanned for wording). */
function reasonOf(line: string): string {
  const idx = line.indexOf(" — ");
  return idx === -1 ? "" : line.slice(idx + 3);
}

export function rubric(report: Report, findings: Finding[]): Check[] {
  const lines = report.text.split("\n");
  const high = findings.filter((f) => f.risk === "high");
  const findingLines = lines.filter((l) => l.startsWith("["));
  const c = report.json.counts;
  const expectedHeader = `tf-guard — ${c.high} high, ${c.medium} medium, ${c.low} low · ${report.json.total} changes`;

  return [
    { id: "every-line-<=100-chars", pass: lines.every((l) => l.length <= 100) },
    {
      // FR-OUT-02: the tool's OWN wording for a high finding must not reassure.
      // Scan the reason only — a user may legitimately name a resource "...safe".
      id: "high-risk-reason-never-reassures",
      pass: high.every((f) => !BANNED_FOR_HIGH.test(reasonOf(summarizeFinding(f)))),
    },
    {
      // Header must reproduce the structured counts exactly, medium included.
      id: "header-counts-match-data-exactly",
      pass: lines[0] === expectedHeader,
    },
    {
      id: "no-high-finding-dropped",
      pass: findingLines.filter((l) => l.includes("[HIGH]")).length === high.length,
    },
    { id: "every-finding-line-has-a-reason", pass: findingLines.every((l) => reasonOf(l) !== "") },
  ];
}
