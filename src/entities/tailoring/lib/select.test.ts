import { describe, expect, it } from "vitest";

import type { Tailoring, TailoringBullet } from "../model/types";
import { exportableBullets, hasOverclaims } from "./select";

const bullets: TailoringBullet[] = [
  { id: "g", text: "Grounded bullet.", grounding: "grounded", includedInExport: true },
  { id: "o", text: "Overclaim bullet.", grounding: "overclaim-risk", includedInExport: false },
];

const tailoring: Tailoring = {
  id: "t1",
  cvProfileId: "cv1",
  jobDescriptionId: "jd1",
  checklist: [],
  bullets,
  matchScore: 72,
};

describe("exportableBullets", () => {
  it("returns only bullets flagged includedInExport, order preserved", () => {
    expect(exportableBullets(tailoring).map((b) => b.id)).toEqual(["g"]);
  });

  it("empty bullets → empty selection", () => {
    expect(exportableBullets({ ...tailoring, bullets: [] })).toEqual([]);
  });
});

describe("hasOverclaims", () => {
  it("true when any bullet is overclaim-risk", () => {
    expect(hasOverclaims(tailoring)).toBe(true);
  });

  it("false when every bullet is grounded", () => {
    const clean: Tailoring = {
      ...tailoring,
      bullets: [bullets[0]],
    };
    expect(hasOverclaims(clean)).toBe(false);
  });
});
