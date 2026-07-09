import { describe, expect, it } from "vitest";

import type { RankedRequirement } from "../model/types";
import { buildJobDescription, normalizeJdText } from "./normalize";

describe("normalizeJdText", () => {
  it("empty / whitespace-only → empty string", () => {
    expect(normalizeJdText("")).toBe("");
    expect(normalizeJdText("   \n  \t \n")).toBe("");
  });

  it("is deterministic: same input → same output", () => {
    const raw = "Senior React dev.\n  5+ years   TypeScript\n\nRemote OK";
    expect(normalizeJdText(raw)).toBe(normalizeJdText(raw));
  });

  it("collapses intra-line whitespace and trims each line", () => {
    expect(normalizeJdText("  Senior   React    dev  ")).toBe("Senior React dev");
    expect(normalizeJdText("A\t\tB")).toBe("A B");
  });

  it("drops blank lines and joins with a single newline", () => {
    expect(normalizeJdText("First\n\n\n  Second  \n")).toBe("First\nSecond");
  });

  it("is idempotent", () => {
    const raw = "  Line   one \n\n Line   two  \n";
    const once = normalizeJdText(raw);
    expect(normalizeJdText(once)).toBe(once);
  });
});

describe("buildJobDescription", () => {
  it("keeps raw, normalizes it, defaults to no requirements", () => {
    const jd = buildJobDescription("  Build   things  \n");
    expect(jd.raw).toBe("  Build   things  \n");
    expect(jd.normalized).toBe("Build things");
    expect(jd.requirements).toEqual([]);
  });

  it("passes ranked requirements through in order", () => {
    const reqs: RankedRequirement[] = [
      { id: "a", text: "React", importance: "must-have", keywords: ["react"], rank: 0 },
      { id: "b", text: "Go", importance: "nice-to-have", keywords: ["golang"], rank: 1 },
    ];
    const jd = buildJobDescription("React and Go", reqs);
    expect(jd.requirements.map((r) => r.id)).toEqual(["a", "b"]);
    expect(jd.requirements).toHaveLength(2);
  });
});
