// reopen mapping — stored tailoring → widget props (add-tailoring-history §6).
import { describe, expect, it } from "vitest";

import type { TailoringRecord } from "@/shared/lib/db";
import { toBullets, toChecklistRows } from "./reopen";

const RECORD: TailoringRecord = {
  id: "t-1",
  userId: "u-1",
  cvProfileId: null,
  jobDescriptionId: "jd-1",
  jobTitle: "Senior Engineer",
  matchScore: 80,
  createdAt: "2026-07-01T00:00:00.000Z",
  checklist: [
    { requirement: "React", importance: "must", status: "met", rationale: "confirmed" },
    { requirement: "AWS", importance: "nice", status: "gap", rationale: "none" },
  ],
  bullets: [
    { text: "Shipped a React app", grounding: "met", included: true },
    { text: "Led 20 people", grounding: "overclaim", included: false },
  ],
};

describe("toChecklistRows", () => {
  it("reverses importance to the widget vocabulary and preserves status/rationale", () => {
    const rows = toChecklistRows(RECORD);
    expect(rows[0].requirement).toMatchObject({ text: "React", importance: "must-have" });
    expect(rows[0]).toMatchObject({ status: "met", rationale: "confirmed" });
    expect(rows[1].requirement.importance).toBe("nice-to-have");
    // Synthetic ids are stable + unique per position.
    expect(rows.map((r) => r.requirement.id)).toEqual(["req-0", "req-1"]);
  });
});

describe("toBullets", () => {
  it("maps only overclaim to the risk flag and preserves included state", () => {
    const bullets = toBullets(RECORD);
    expect(bullets[0]).toMatchObject({ grounding: "grounded", includedInExport: true });
    expect(bullets[1]).toMatchObject({ grounding: "overclaim-risk", includedInExport: false });
    expect(bullets.map((b) => b.id)).toEqual(["blt-0", "blt-1"]);
  });
});
