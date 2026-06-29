import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePlan } from "../src/lib/parse.js";

const fixture = JSON.parse(
  readFileSync(fileURLToPath(new URL("./fixtures/plan-mixed.json", import.meta.url)), "utf8"),
);

describe("parsePlan (FR-PARSE-01)", () => {
  const changes = parsePlan(fixture);

  it("extracts every resource change", () => {
    assert.equal(changes.length, 5);
    assert.ok(changes.map((c) => c.address).includes("aws_db_instance.main"));
  });

  it("normalizes ['delete','create'] into a replace action", () => {
    const bucket = changes.find((c) => c.address === "aws_s3_bucket.assets");
    assert.equal(bucket?.action, "replace");
  });

  it("reads tags from `before` for deletes and `after` otherwise", () => {
    const del = changes.find((c) => c.address === "aws_db_instance.main");
    assert.deepEqual(del?.tags, { owner: "team-data", environment: "prod" });
    const create = changes.find((c) => c.address === "aws_instance.worker");
    assert.deepEqual(create?.tags, { environment: "staging" });
  });

  it("treats a missing resource_changes as an empty plan", () => {
    assert.deepEqual(parsePlan({}), []);
  });
});

describe("parsePlan (FR-PARSE-02)", () => {
  it("throws a clear error on malformed input", () => {
    assert.throws(() => parsePlan({ resource_changes: [{ address: "a" }] }), /plan/i);
    assert.throws(() => parsePlan("nope"), /plan/i);
  });
});
