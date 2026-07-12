import { describe, expect, it } from "vitest";
import { matchNaceEntry } from "@/lib/nace/match";
import type { MatchResult } from "@/lib/nace/types";

const expectMatchedId = (result: MatchResult, expectedId: string): void => {
  expect(result.kind).toBe("matched");
  if (result.kind === "matched") {
    expect(result.entry.id).toBe(expectedId);
  }
};

// @trace FR-NACE-05
describe("matchNaceEntry — unambiguous matches (FR-NACE-05)", () => {
  const matchedCases = [
    {
      language: "UA",
      input: "Розробка ЛОГОТИПІВ та Брендбуку",
      expectedId: "graphic-design",
    },
    {
      language: "EN",
      input: "Logo and Corporate IDENTITY design",
      expectedId: "graphic-design",
    },
    {
      language: "UA",
      input: "Створення ВІРТУАЛЬНОГО туру з точкою 360°",
      expectedId: "visualization-3d-360",
    },
    {
      language: "EN",
      input: "Interactive 360 VIRTUAL Tour visualization",
      expectedId: "visualization-3d-360",
    },
    {
      language: "UA",
      input: "Спеціалізований ДИЗАЙН",
      expectedId: "specialized-design-3d",
    },
    {
      language: "EN",
      input: "SPECIALIZED Design services",
      expectedId: "specialized-design-3d",
    },
    {
      language: "UA",
      input: "ВідеоМОНТАЖ і кольорокорекція",
      expectedId: "video-post-production",
    },
    {
      language: "EN",
      input: "Video Editing and COLOR Correction",
      expectedId: "video-post-production",
    },
  ];

  it.each(matchedCases)(
    "$language mixed-case input “$input” matches $expectedId",
    ({ input, expectedId }) => {
      expectMatchedId(matchNaceEntry(input), expectedId);
    }
  );
});

// @trace FR-NACE-05
describe("matchNaceEntry — language-insensitive resolution (FR-NACE-05)", () => {
  const bilingualPairs = [
    {
      inputUa: "послуги з відеомонтажу",
      inputEn: "video editing services",
      expectedId: "video-post-production",
    },
    {
      inputUa: "розробка логотипу",
      inputEn: "logo design",
      expectedId: "graphic-design",
    },
  ];

  it.each(bilingualPairs)(
    "UA “$inputUa” and EN “$inputEn” resolve to the same entry",
    ({ inputUa, inputEn, expectedId }) => {
      expectMatchedId(matchNaceEntry(inputUa), expectedId);
      expectMatchedId(matchNaceEntry(inputEn), expectedId);
    }
  );
});

// @trace FR-NACE-05
describe("matchNaceEntry — ambiguous tie, never a silent pick (FR-NACE-05)", () => {
  const overlapInputs = ["3D дизайн", "3Д Дизайн", "3d design"];

  it.each(overlapInputs)(
    "“%s” returns ambiguous with both 74.12 design candidates",
    (input) => {
      const result = matchNaceEntry(input);
      expect(result.kind).toBe("ambiguous");
      if (result.kind === "ambiguous") {
        const candidateIds = result.candidates.map((entry) => entry.id).sort();
        expect(candidateIds).toEqual(["graphic-design", "visualization-3d-360"]);
      }
    }
  );
});

// @trace FR-NACE-05
describe("matchNaceEntry — no match (FR-NACE-05)", () => {
  const noMatchInputs = [
    "xyzzy qwerty",
    "фіолетовий носоріг",
    "",
    "   ...!!!???   ",
  ];

  it.each(noMatchInputs)("“%s” returns none", (input) => {
    expect(matchNaceEntry(input)).toEqual({ kind: "none" });
  });
});

describe("matchNaceEntry — pure over the provided entries", () => {
  it("matches nothing when given an empty catalog", () => {
    expect(matchNaceEntry("logo design", [])).toEqual({ kind: "none" });
  });
});

describe("matchNaceEntry — keywords anchor at word starts (review regression)", () => {
  const unrelatedInputs = [
    // «монтаж» must not fire inside «Демонтаж» (equipment dismantling ≠ video editing)
    "Демонтаж обладнання",
    // «лого» must not fire inside «аналогових»
    "Оцифрування аналогових касет",
    // «360» must not fire inside the price «3600»
    "Оренда залу, 3600 грн",
  ];

  it.each(unrelatedInputs)("unrelated “%s” returns none", (input) => {
    expect(matchNaceEntry(input)).toEqual({ kind: "none" });
  });

  it("still matches Ukrainian inflections via prefix stems", () => {
    expectMatchedId(matchNaceEntry("розробка логотипів"), "graphic-design");
    expectMatchedId(matchNaceEntry("послуги відеомонтажу"), "video-post-production");
  });
});

describe("matchNaceEntry — Unicode normalization (review regression)", () => {
  it("matches NFD-decomposed Ukrainian input (й/ї as combining marks)", () => {
    expectMatchedId(matchNaceEntry("дизайн".normalize("NFD")), "graphic-design");
    expectMatchedId(
      matchNaceEntry("Створення віртуального туру".normalize("NFD")),
      "visualization-3d-360"
    );
  });

  it("resolves NFC and NFD forms of the same input identically", () => {
    const input = "ВідеоМОНТАЖ і кольорокорекція";
    expect(matchNaceEntry(input.normalize("NFD"))).toEqual(
      matchNaceEntry(input.normalize("NFC"))
    );
  });
});
