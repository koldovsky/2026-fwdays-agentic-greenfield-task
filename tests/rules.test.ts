import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { requiredTags, riskyDelete } from "../src/lib/rules/index.js";
import type { ResourceChange } from "../src/lib/types.js";

const base: ResourceChange = {
  address: "aws_instance.x",
  type: "aws_instance",
  name: "x",
  action: "create",
  tags: { owner: "team", environment: "prod" },
};

describe("requiredTags (FR-TAGS-01)", () => {
  it("flags a created resource missing a required tag", () => {
    const hit = requiredTags({ ...base, tags: { environment: "prod" } });
    assert.equal(hit?.id, "missing-required-tags");
    assert.equal(hit?.weight, 20);
    assert.ok(hit?.detail.includes("owner"));
  });

  it("passes when all required tags are present", () => {
    assert.equal(requiredTags(base), null);
  });

  it("does not apply to deletes (the resource is going away)", () => {
    assert.equal(requiredTags({ ...base, action: "delete", tags: {} }), null);
  });
});

describe("riskyDelete (FR-RISK-01)", () => {
  it("flags a delete of a stateful resource", () => {
    const hit = riskyDelete({ ...base, type: "aws_db_instance", action: "delete" });
    assert.equal(hit?.id, "risky-delete");
    assert.equal(hit?.weight, 50);
  });

  it("flags a replace of a stateful resource", () => {
    const hit = riskyDelete({ ...base, type: "aws_s3_bucket", action: "replace" });
    assert.equal(hit?.id, "risky-delete");
  });

  it("ignores a create of a stateful resource type", () => {
    assert.equal(riskyDelete({ ...base, type: "aws_db_instance", action: "create" }), null);
  });

  it("ignores a delete of a stateless resource", () => {
    assert.equal(riskyDelete({ ...base, type: "aws_iam_role", action: "delete" }), null);
  });

  it("does not false-positive on lookalike stateless types", () => {
    // aws_s3_bucket_public_access_block and aws_iam_instance_profile are config, not state.
    assert.equal(
      riskyDelete({ ...base, type: "aws_s3_bucket_public_access_block", action: "delete" }),
      null,
    );
    assert.equal(
      riskyDelete({ ...base, type: "aws_iam_instance_profile", action: "delete" }),
      null,
    );
  });
});
