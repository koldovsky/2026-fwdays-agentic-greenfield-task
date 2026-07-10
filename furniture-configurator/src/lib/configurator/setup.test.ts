import { describe, expect, it } from "vitest";

describe("test runner setup", () => {
  it("runs a trivial assertion", () => {
    expect(1 + 1).toBe(2);
  });
});
