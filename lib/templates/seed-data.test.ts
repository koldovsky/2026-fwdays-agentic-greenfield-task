// @trace FR-TPL-01
import { describe, expect, it } from "vitest";
import { templateSchema } from "@/lib/schemas/template";
import { seedTemplates } from "@/lib/templates/seed-data";

/**
 * Seed-data validity (FR-TPL-01). The two seeded templates must parse cleanly
 * against `templateSchema`, each carry at least one question, and have distinct
 * names and distinct methodologies — so a freshly seeded database holds two
 * genuinely different, well-formed read-only templates.
 */
describe("seedTemplates", () => {
  it("ships at least two seeded templates", () => {
    expect(seedTemplates.length).toBeGreaterThanOrEqual(2);
  });

  it("every seed template parses cleanly via templateSchema", () => {
    for (const template of seedTemplates) {
      expect(templateSchema.safeParse(template).success).toBe(true);
    }
  });

  it("every seed template has at least one question", () => {
    for (const template of seedTemplates) {
      expect(template.questions.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("seed templates have distinct names", () => {
    const names = seedTemplates.map((template) => template.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("seed templates represent distinct methodologies", () => {
    const methodologies = seedTemplates.map((template) => template.methodology);
    expect(new Set(methodologies).size).toBe(methodologies.length);
  });
});
