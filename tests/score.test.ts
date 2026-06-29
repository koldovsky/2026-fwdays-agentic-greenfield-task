import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePlan } from "../src/lib/parse.js";
import { scoreChanges, classify, HIGH_RISK_THRESHOLD } from "../src/lib/score.js";

const fixture = JSON.parse(
  readFileSync(fileURLToPath(new URL("./fixtures/plan-mixed.json", import.meta.url)), "utf8"),
);
const findings = scoreChanges(parsePlan(fixture));
const byAddress = (a: string) => findings.find((f) => f.address === a);

describe("scoreChanges (FR-SCORE-01)", () => {
  it("scores a stateful delete at 90 (action 40 + risky-delete 50)", () => {
    assert.equal(byAddress("aws_db_instance.main")?.score, 90);
  });

  it("scores a create missing one tag at 25 (action 5 + tags 20)", () => {
    assert.equal(byAddress("aws_instance.worker")?.score, 25);
  });

  it("scores a clean update at 15 (action only, no rule hits)", () => {
    const iam = byAddress("aws_iam_role.ci");
    assert.equal(iam?.score, 15);
    assert.equal(iam?.rules.length, 0);
  });

  it("clamps to 0..100", () => {
    for (const f of findings) {
      assert.ok(f.score >= 0 && f.score <= 100);
    }
  });
});

describe("classify", () => {
  it("uses the high-risk threshold", () => {
    assert.equal(classify(HIGH_RISK_THRESHOLD), "high");
    assert.notEqual(classify(HIGH_RISK_THRESHOLD - 1), "high");
    assert.equal(classify(0), "low");
  });
});

describe("ranking (FR-SCORE-02)", () => {
  it("orders by score desc, ties broken alphabetically by address", () => {
    // aws_db_instance.main and aws_s3_bucket.assets both score 90.
    const top2 = findings.slice(0, 2).map((f) => f.address);
    assert.deepEqual(top2, ["aws_db_instance.main", "aws_s3_bucket.assets"]);
  });
});
