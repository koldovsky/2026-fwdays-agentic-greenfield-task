import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePlan } from "../src/lib/parse.js";
import { scoreChanges } from "../src/lib/score.js";
import { summarize, summarizeFinding } from "../src/lib/summarize.js";
import type { Finding } from "../src/lib/types.js";

const fixture = JSON.parse(
  readFileSync(fileURLToPath(new URL("./fixtures/plan-mixed.json", import.meta.url)), "utf8"),
);
const findings = scoreChanges(parsePlan(fixture));

describe("summarizeFinding (FR-OUT-02)", () => {
  const high = findings.find((f) => f.risk === "high") as Finding;

  it("never describes a high-risk finding as safe", () => {
    const line = summarizeFinding(high).toLowerCase();
    assert.ok(!/\b(safe|ok|fine)\b/.test(line));
  });

  it("keeps every line within 100 characters", () => {
    for (const f of findings) {
      assert.ok(summarizeFinding(f).length <= 100);
    }
  });

  it("includes the risk level and the resource address", () => {
    const line = summarizeFinding(high);
    assert.ok(line.includes("HIGH"));
    assert.ok(line.includes(high.address));
  });

  it("preserves the reason for a very long address (middle truncation)", () => {
    const longName = "x".repeat(140);
    const f: Finding = {
      address: `aws_db_instance.${longName}`,
      type: "aws_db_instance",
      action: "delete",
      rules: [{ id: "risky-delete", weight: 50, detail: "delete of stateful resource" }],
      score: 90,
      risk: "high",
    };
    const line = summarizeFinding(f);
    assert.ok(line.length <= 100);
    assert.ok(line.includes("HIGH"));
    assert.ok(line.endsWith("delete of stateful resource")); // reason survives
    assert.ok(line.includes("…")); // address was middle-truncated
  });
});

describe("summarize report", () => {
  const report = summarize(findings);

  it("counts high-risk findings and only lists actionable ones", () => {
    assert.equal(report.json.highRiskCount, 2);
    // 3 actionable (2 stateful destroys + 1 missing tag); 2 with no policy hits.
    assert.equal(report.json.findings.length, 3);
    assert.ok(report.text.includes("2 high"));
  });
});
