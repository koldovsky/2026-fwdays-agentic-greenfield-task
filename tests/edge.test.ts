import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parsePlan } from "../src/lib/parse.js";
import { scoreChanges } from "../src/lib/score.js";
import { summarize } from "../src/lib/summarize.js";

function plan(changes: unknown[]) {
  return { resource_changes: changes };
}

describe("unknown actions fail safe (not silently zero)", () => {
  const changes = parsePlan(
    plan([
      {
        address: "aws_db_instance.novel",
        type: "aws_db_instance",
        name: "novel",
        change: { actions: ["forget"], before: { tags: {} }, after: null },
      },
    ]),
  );

  it("normalizes an unrecognized action to 'unknown'", () => {
    assert.equal(changes[0]?.action, "unknown");
  });

  it("scores it as risky (weight 40), never 0", () => {
    const f = scoreChanges(changes)[0];
    assert.equal(f?.score, 40);
    assert.notEqual(f?.risk, "low");
  });
});

describe("['no-op'] still normalizes to no-op", () => {
  it("does not get swept into 'unknown'", () => {
    const changes = parsePlan(
      plan([
        {
          address: "aws_x.y",
          type: "aws_x",
          name: "y",
          change: { actions: ["no-op"], before: null, after: { tags: {} } },
        },
      ]),
    );
    assert.equal(changes[0]?.action, "no-op");
  });
});

describe("elevated risk without a policy rule is still reported (no header/body contradiction)", () => {
  const findings = scoreChanges(
    parsePlan(
      plan([
        {
          address: "aws_iam_role.api",
          type: "aws_iam_role",
          name: "api",
          change: {
            actions: ["delete", "create"],
            before: { tags: { owner: "o", environment: "prod" } },
            after: { tags: { owner: "o", environment: "prod" } },
          },
        },
      ]),
    ),
  );

  it("surfaces a medium stateless replace that matches no rule", () => {
    const report = summarize(findings);
    assert.equal(report.json.counts.medium, 1);
    assert.equal(report.json.findings.length, 1); // shown, not hidden in the quiet bucket
    assert.ok(report.text.includes("[MED ]"));
  });
});
