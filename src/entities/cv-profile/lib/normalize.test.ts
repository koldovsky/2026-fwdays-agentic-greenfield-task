import { describe, expect, it } from "vitest";

import { normalizeCvText } from "./normalize";

describe("normalizeCvText", () => {
  it("empty string → { skills: [], sentences: [] }", () => {
    expect(normalizeCvText("")).toEqual({ skills: [], sentences: [] });
    expect(normalizeCvText("   \n  ")).toEqual({ skills: [], sentences: [] });
  });

  it("is deterministic: same input → same output", () => {
    const raw = "Skills: React, Node.js\nBuilt an API. Shipped it!";
    expect(normalizeCvText(raw)).toEqual(normalizeCvText(raw));
  });

  it("splits into trimmed, non-empty sentences", () => {
    const { sentences } = normalizeCvText("  First one.  Second!  Third? \n");
    expect(sentences).toEqual(["First one", "Second", "Third"]);
    for (const s of sentences) {
      expect(s.length).toBeGreaterThan(0);
      expect(s).toBe(s.trim());
    }
  });

  it("derives skills from a skills-like line, deduped + lowercased", () => {
    const { skills } = normalizeCvText(
      "Skills: React, react, Node.js; TypeScript / GraphQL\nSome prose here.",
    );
    expect(skills).toEqual(["react", "node.js", "typescript", "graphql"]);
  });

  it("supports a Ukrainian skills line", () => {
    const { skills } = normalizeCvText("Навички: Python, SQL, Docker");
    expect(skills).toEqual(["python", "sql", "docker"]);
  });

  it("falls back to notable tokens when no skills line is present", () => {
    const { skills } = normalizeCvText("Worked with React and Node.js daily.");
    expect(skills).toContain("react");
    expect(skills).toContain("node.js");
    // deduped + lowercased
    expect(new Set(skills).size).toBe(skills.length);
    for (const s of skills) expect(s).toBe(s.toLowerCase());
  });
});
