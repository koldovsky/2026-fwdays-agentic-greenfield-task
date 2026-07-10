// persistTailoring — mapping + insert order (add-tailoring-history, FR-TAILOR-04).
import { describe, expect, it, vi } from "vitest";

import { persistTailoring } from "./persist-tailoring";
import type { TailoringRunResult } from "../model/types";

function deps() {
  return {
    jobDescriptions: { save: vi.fn().mockResolvedValue({ id: "jd-9" }) },
    tailorings: { save: vi.fn().mockResolvedValue({ id: "t-9" }) },
  };
}

const RESULT: TailoringRunResult = {
  matchScore: 73,
  checklist: [
    {
      requirement: { id: "r1", text: "React", importance: "must-have", keywords: ["react"] },
      item: { status: "met", rationale: "confirmed" },
    },
    {
      requirement: { id: "r2", text: "AWS", importance: "nice-to-have", keywords: ["aws"] },
      item: { status: "gap", rationale: "none" },
    },
  ],
  bullets: [
    { id: "b1", text: "Shipped a React app", grounding: "grounded", includedInExport: true },
    { id: "b2", text: "Led 20 people", grounding: "overclaim-risk", includedInExport: false },
  ],
};

describe("persistTailoring", () => {
  it("saves the JD first, then the tailoring with mapped fields and no CV linkage", async () => {
    const d = deps();
    const id = await persistTailoring(d, {
      userId: "u-1",
      jobDescription: "Position: Senior React Developer\nWe build things",
      result: RESULT,
    });

    expect(id).toBe("t-9");
    expect(d.jobDescriptions.save).toHaveBeenCalledWith(
      "u-1",
      "Position: Senior React Developer\nWe build things",
    );

    const saved = d.tailorings.save.mock.calls[0][0];
    expect(saved).toMatchObject({
      userId: "u-1",
      cvProfileId: null,
      jobDescriptionId: "jd-9",
      jobTitle: "Senior React Developer",
      matchScore: 73,
    });
  });

  it("maps importance, grounding, status, and included correctly", async () => {
    const d = deps();
    await persistTailoring(d, { userId: "u-1", jobDescription: "x", result: RESULT });
    const saved = d.tailorings.save.mock.calls[0][0];

    expect(saved.checklist).toEqual([
      { requirement: "React", importance: "must", status: "met", rationale: "confirmed" },
      { requirement: "AWS", importance: "nice", status: "gap", rationale: "none" },
    ]);
    expect(saved.bullets).toEqual([
      { text: "Shipped a React app", grounding: "met", included: true },
      { text: "Led 20 people", grounding: "overclaim", included: false },
    ]);
  });

  it("stores a null job title when the JD has none", async () => {
    const d = deps();
    await persistTailoring(d, {
      userId: "u-1",
      jobDescription: "We are a company that builds great products for everyone.",
      result: RESULT,
    });
    expect(d.tailorings.save.mock.calls[0][0].jobTitle).toBeNull();
  });
});
