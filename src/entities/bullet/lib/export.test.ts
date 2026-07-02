import { describe, expect, it } from "vitest";

import type { Bullet } from "../model/types";
import {
  applyExportDefaults,
  defaultIncludeInExport,
  exportBullets,
} from "./export";

const grounded: Bullet = {
  id: "g",
  text: "Led migration to TypeScript.",
  grounding: "grounded",
  sourceSentence: "Migrated the codebase to TypeScript.",
  includedInExport: false,
};

const overclaim: Bullet = {
  id: "o",
  text: "Scaled the platform to 10M users.",
  grounding: "overclaim-risk",
  includedInExport: false,
};

describe("defaultIncludeInExport", () => {
  it("grounded → included, overclaim-risk → excluded (FR-BULLETS-02)", () => {
    expect(defaultIncludeInExport("grounded")).toBe(true);
    expect(defaultIncludeInExport("overclaim-risk")).toBe(false);
  });
});

describe("applyExportDefaults", () => {
  it("includes grounded and excludes overclaim-risk by default (BC-HONESTY-02)", () => {
    const [g, o] = applyExportDefaults([grounded, overclaim]);
    expect(g.includedInExport).toBe(true);
    expect(o.includedInExport).toBe(false);
  });

  it("does not mutate the input bullets", () => {
    const input: Bullet[] = [{ ...grounded, includedInExport: false }];
    const before = input[0].includedInExport;
    applyExportDefaults(input);
    expect(input[0].includedInExport).toBe(before);
  });

  it("empty input → empty output", () => {
    expect(applyExportDefaults([])).toEqual([]);
  });
});

describe("exportBullets", () => {
  it("returns only bullets flagged includedInExport, order preserved", () => {
    const bullets = applyExportDefaults([grounded, overclaim]);
    const out = exportBullets(bullets);
    expect(out.map((b) => b.id)).toEqual(["g"]);
  });

  it("includes an overclaim-risk bullet only after explicit opt-in (BC-HONESTY-02)", () => {
    const acknowledged: Bullet = { ...overclaim, includedInExport: true };
    const out = exportBullets([grounded, acknowledged]);
    expect(out.map((b) => b.id)).toEqual(["o"]);
  });
});
