// Export body (task 2.1, BC-HONESTY-02): only included bullets are exported —
// an overclaim-risk bullet left excluded never reaches the file.
import { describe, expect, it } from "vitest";
import type { Bullet } from "@/entities/bullet";
import { buildExportText } from "./export-text";

const bullets: readonly Bullet[] = [
  { id: "b1", text: "Shipped a React platform.", grounding: "grounded", includedInExport: true },
  { id: "b2", text: "Led a 12-person org.", grounding: "overclaim-risk", includedInExport: false },
  { id: "b3", text: "Owned CI/CD.", grounding: "grounded", includedInExport: true },
];

describe("buildExportText", () => {
  it("renders only included bullets, one dash line each", () => {
    expect(buildExportText(bullets)).toBe("- Shipped a React platform.\n- Owned CI/CD.");
  });

  it("never includes an excluded overclaim-risk bullet (BC-HONESTY-02)", () => {
    expect(buildExportText(bullets)).not.toContain("12-person");
  });

  it("returns an empty string when nothing is included", () => {
    expect(buildExportText([{ ...bullets[1] }])).toBe("");
  });
});
