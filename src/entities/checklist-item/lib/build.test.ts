import { describe, expect, it } from "vitest";

import type { CvProfile, Requirement } from "@/shared/lib/scoring";

import { buildChecklist } from "./build";

const cv: CvProfile = {
  skills: ["react", "typescript"],
  sentences: ["Built dashboards with React and TypeScript at scale."],
};

describe("buildChecklist", () => {
  it("empty requirements → { rows: [], score: 0 }", () => {
    expect(buildChecklist([], cv)).toEqual({ rows: [], score: 0 });
  });

  it("returns one row per requirement, in input order", () => {
    const reqs: Requirement[] = [
      { id: "a", text: "React", importance: "must-have", keywords: ["react"] },
      { id: "b", text: "Go", importance: "nice-to-have", keywords: ["golang"] },
      { id: "c", text: "TS", importance: "must-have", keywords: ["typescript"] },
    ];
    const { rows } = buildChecklist(reqs, cv);
    expect(rows.map((r) => r.requirement.id)).toEqual(["a", "b", "c"]);
    expect(rows).toHaveLength(reqs.length);
  });

  it("score is an integer within 0–100", () => {
    const reqs: Requirement[] = [
      { id: "a", text: "React", importance: "must-have", keywords: ["react"] },
      { id: "b", text: "Go", importance: "nice-to-have", keywords: ["golang"] },
    ];
    const { score } = buildChecklist(reqs, cv);
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("meeting a must-have outscores meeting only a nice-to-have (FR-CHECKLIST-04)", () => {
    const mustHave: Requirement = {
      id: "m",
      text: "React",
      importance: "must-have",
      keywords: ["react"],
    };
    const niceToHave: Requirement = {
      id: "n",
      text: "React",
      importance: "nice-to-have",
      keywords: ["react"],
    };
    const gap: Requirement = {
      id: "g",
      text: "Rust",
      importance: "must-have",
      keywords: ["rust"],
    };

    const metMustHave = buildChecklist([mustHave, gap], cv).score;
    const metNiceOnly = buildChecklist([niceToHave, gap], cv).score;

    expect(metMustHave).toBeGreaterThan(metNiceOnly);
  });

  it("forwards seniority to checklistItem: a claimed-only skill is partial with 'senior', overclaim-risk without it (improve-tailoring-quality T5)", () => {
    const claimedOnlyCv: CvProfile = {
      skills: ["kubernetes"],
      sentences: ["No mention of containers in this sentence."],
    };
    const reqs: Requirement[] = [
      {
        id: "k",
        text: "Kubernetes",
        importance: "must-have",
        keywords: ["kubernetes"],
      },
    ];

    const withoutSeniority = buildChecklist(reqs, claimedOnlyCv);
    expect(withoutSeniority.rows[0]?.item.status).toBe("overclaim-risk");

    const withSenior = buildChecklist(reqs, claimedOnlyCv, "senior");
    expect(withSenior.rows[0]?.item.status).toBe("partial");
  });
});
