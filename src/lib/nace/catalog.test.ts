import { describe, expect, it } from "vitest";
import { naceCatalog } from "@/lib/nace/catalog";

const NACE_CLASS_PATTERN = /^\d{2}\.\d{2}$/;

/** Expected seed rows, byte-for-byte from the nace-catalog delta spec. */
const expectedSeedEntries = [
  {
    id: "graphic-design",
    naceClass: "74.12",
    officialNameUa: "Діяльність із графічного та візуального дизайну",
    lineTextEn:
      "Graphic design services: development of logos, corporate identity, brand book and related graphic design services",
    lineTextUa:
      "Послуги графічного дизайну: розробка логотипів, фірмового стилю, брендбуку та інші послуги у сфері графічного дизайну",
    legacyKvedClass: "74.10",
  },
  {
    id: "visualization-3d-360",
    naceClass: "74.12",
    officialNameUa: "Діяльність із графічного та візуального дизайну",
    lineTextEn:
      "Graphic 3D design services (visualization): creation of an interactive 360° point for virtual tour",
    lineTextUa:
      "Послуги графічного 3Д дизайну (візуалізації): створення інтерактивної точки 360° для віртуального туру",
    legacyKvedClass: "74.10",
  },
  {
    id: "specialized-design-3d",
    naceClass: "74.14",
    officialNameUa: "Інша спеціалізована діяльність із дизайну",
    lineTextEn:
      "Specialized design services (3D / interactive visualization) as per agreed scope",
    lineTextUa:
      "Спеціалізовані послуги з дизайну (3D / інтерактивна візуалізація) згідно узгодженого обсягу",
    legacyKvedClass: "74.10",
  },
  {
    id: "video-post-production",
    naceClass: "59.12",
    officialNameUa: "Компонування кіно- та відеофільмів, телевізійних програм",
    lineTextEn:
      "Video editing services: editing, special effects, color correction and related post-production",
    lineTextUa:
      "Послуги з відеомонтажу: редагування відеоматеріалів, створення спецефектів, кольорокорекція та інші послуги з обробки відео",
    legacyKvedClass: "59.12",
  },
] as const;

// @trace FR-NACE-01, FR-NACE-02, FR-NACE-03, FR-NACE-04
describe("naceCatalog seed entries (FR-NACE-02/03/04)", () => {
  it("contains exactly the four MVP seed entries", () => {
    expect(naceCatalog).toHaveLength(expectedSeedEntries.length);
  });

  it.each(expectedSeedEntries)(
    "entry $id carries the exact spec fields",
    (expected) => {
      const entry = naceCatalog.find((candidate) => candidate.id === expected.id);
      expect(entry).toBeDefined();
      expect(entry?.naceClass).toBe(expected.naceClass);
      expect(entry?.officialNameUa).toBe(expected.officialNameUa);
      expect(entry?.lineTextEn).toBe(expected.lineTextEn);
      expect(entry?.lineTextUa).toBe(expected.lineTextUa);
      expect(entry?.legacyKvedClass).toBe(expected.legacyKvedClass);
    }
  );
});

// @trace FR-NACE-01
describe("entry identity and class codes (FR-NACE-01)", () => {
  it("uses the entry id as a unique key", () => {
    const ids = naceCatalog.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(naceCatalog.length);
  });

  it("carries NACE 2.1-UA class codes in XX.XX format", () => {
    for (const entry of naceCatalog) {
      expect(entry.naceClass).toMatch(NACE_CLASS_PATTERN);
    }
  });

  it("holds two 74.12 entries with distinct ids and distinct line texts", () => {
    const sharedClassEntries = naceCatalog.filter(
      (entry) => entry.naceClass === "74.12"
    );
    expect(sharedClassEntries).toHaveLength(2);
    const [first, second] = sharedClassEntries;
    expect(first?.id).not.toBe(second?.id);
    expect(first?.lineTextEn).not.toBe(second?.lineTextEn);
    expect(first?.lineTextUa).not.toBe(second?.lineTextUa);
  });
});

describe("official taxonomy boundary (BC-NACE-01)", () => {
  it("keeps КВЕД / ДК 009 out of every UI-facing line text", () => {
    for (const entry of naceCatalog) {
      for (const lineText of [entry.lineTextEn, entry.lineTextUa]) {
        expect(lineText).not.toContain("КВЕД");
        expect(lineText).not.toContain("квед");
        expect(lineText).not.toContain("ДК 009");
      }
    }
  });

  it("keeps КВЕД / ДК 009 out of official names and keywords", () => {
    for (const entry of naceCatalog) {
      expect(entry.officialNameUa).not.toContain("КВЕД");
      expect(entry.officialNameUa).not.toContain("ДК 009");
      for (const keyword of entry.keywords) {
        expect(keyword).not.toContain("квед");
        expect(keyword).not.toContain("дк 009");
      }
    }
  });
});

describe("matcher keyword hygiene (design D3)", () => {
  it("stores keywords lowercase and non-empty", () => {
    for (const entry of naceCatalog) {
      expect(entry.keywords.length).toBeGreaterThan(0);
      for (const keyword of entry.keywords) {
        expect(keyword).toBe(keyword.toLowerCase());
        expect(keyword.trim()).toBe(keyword);
        expect(keyword.length).toBeGreaterThan(0);
      }
    }
  });
});
