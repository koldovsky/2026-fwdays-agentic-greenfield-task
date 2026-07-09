// §4: the cover-letter builder assembles prose from the tailoring's grounded,
// kept bullets and NEVER re-derives overclaim exclusion — an excluded
// overclaim-risk bullet must not reach the letter (BC-HONESTY-02, §4 scenario).
import type { Bullet } from "@/entities/bullet";
import { describe, expect, it } from "vitest";

import { buildCoverLetterDocument, buildGroundedCoverLetterDocument } from "./build-document";

const bullets: readonly Bullet[] = [
  { id: "b1", text: "Побудував платіжну систему на React.", grounding: "grounded", includedInExport: true },
  { id: "b2", text: "Керував командою з 50 інженерів.", grounding: "overclaim-risk", includedInExport: false },
  { id: "b3", text: "Впровадив CI/CD для мобільного застосунку.", grounding: "grounded", includedInExport: true },
];

const frame = {
  headline: "Супровідний лист",
  greeting: "Доброго дня!",
  intro: "Ось релевантний досвід.",
  closing: "З повагою.",
};

describe("buildCoverLetterDocument (§4, BC-HONESTY-02)", () => {
  it("reflows only the grounded, kept bullets into prose paragraphs", () => {
    const doc = buildCoverLetterDocument(bullets, frame);
    const paragraphs = doc.coverLetter?.paragraphs ?? [];

    // greeting, intro, the two grounded bullets, closing.
    expect(paragraphs).toEqual([
      frame.greeting,
      frame.intro,
      bullets[0].text,
      bullets[2].text,
      frame.closing,
    ]);
    expect(doc.headline).toBe(frame.headline);
    expect(doc.bullets).toEqual([]);
  });

  it("never lets an excluded overclaim-risk bullet into the letter", () => {
    const doc = buildCoverLetterDocument(bullets, frame);
    const joined = (doc.coverLetter?.paragraphs ?? []).join("\n");
    expect(joined).not.toContain("50 інженерів");
  });

  it("applies the free-tier footer when supplied, omits it when paid", () => {
    const free = buildCoverLetterDocument(bullets, { ...frame, footer: "Vouch" });
    expect(free.footer).toBe("Vouch");
    const paid = buildCoverLetterDocument(bullets, frame);
    expect(paid.footer).toBeUndefined();
  });

  it("handles no kept bullets — still a valid document with just the frame", () => {
    const none = bullets.map((b) => ({ ...b, includedInExport: false }));
    const doc = buildCoverLetterDocument(none, frame);
    expect(doc.coverLetter?.paragraphs).toEqual([frame.greeting, frame.intro, frame.closing]);
  });
});

// ---------------------------------------------------------------------------
// buildGroundedCoverLetterDocument (T5 §3.1/3.3, BC-HONESTY-01/02)
// The verified LLM letter is assembled with neutral localized framing.
// Only VERIFIED paragraphs may reach this builder — the route ensures this.
// ---------------------------------------------------------------------------

describe("buildGroundedCoverLetterDocument (T5 §3.1/3.3, BC-HONESTY-01/02)", () => {
  const verifiedParagraphs = [
    "Я побудував платіжну систему на React за два квартали.",
    "Координував роботу трьох бекенд-розробників і забезпечував узгодженість між сервісами.",
  ];

  it("wraps verified paragraphs in greeting+closing framing in the correct order", () => {
    const doc = buildGroundedCoverLetterDocument(
      { paragraphs: verifiedParagraphs },
      {
        headline: "Супровідний лист",
        greeting: "Доброго дня,",
        closing: "Буду радий обговорити деталі. З повагою.",
      },
    );

    const paragraphs = doc.coverLetter?.paragraphs ?? [];
    expect(paragraphs[0]).toBe("Доброго дня,");
    expect(paragraphs[1]).toBe(verifiedParagraphs[0]);
    expect(paragraphs[2]).toBe(verifiedParagraphs[1]);
    expect(paragraphs[3]).toBe("Буду радий обговорити деталі. З повагою.");
    expect(doc.headline).toBe("Супровідний лист");
    expect(doc.bullets).toEqual([]);
  });

  it("builds the document without the intro field (LLM writes its own opening body)", () => {
    // The grounded path intentionally omits `intro` — the LLM prose supplies the
    // opening body; adding `intro` would duplicate it.
    const doc = buildGroundedCoverLetterDocument(
      { paragraphs: verifiedParagraphs },
      { greeting: "Доброго дня,", closing: "З повагою." },
    );
    const paragraphs = doc.coverLetter?.paragraphs ?? [];
    // greeting, then the 2 LLM paragraphs, then closing — no extra intro line.
    expect(paragraphs).toHaveLength(4);
    expect(paragraphs[0]).toBe("Доброго дня,");
    expect(paragraphs[1]).toBe(verifiedParagraphs[0]);
    expect(paragraphs[3]).toBe("З повагою.");
  });

  it("omits greeting/closing when not supplied — only the verified paragraphs", () => {
    const doc = buildGroundedCoverLetterDocument({ paragraphs: verifiedParagraphs });
    expect(doc.coverLetter?.paragraphs).toEqual(verifiedParagraphs);
  });

  it("applies the free-tier footer when supplied (FR-EXPORT-04)", () => {
    const doc = buildGroundedCoverLetterDocument(
      { paragraphs: verifiedParagraphs },
      { footer: "Адаптовано за допомогою Vouch" },
    );
    expect(doc.footer).toBe("Адаптовано за допомогою Vouch");
  });

  it("omits footer when not supplied (paid path)", () => {
    const doc = buildGroundedCoverLetterDocument({ paragraphs: verifiedParagraphs });
    expect(doc.footer).toBeUndefined();
  });

  it("omits headline when not supplied", () => {
    const doc = buildGroundedCoverLetterDocument({ paragraphs: verifiedParagraphs });
    expect(doc.headline).toBeUndefined();
  });

  it("always produces an empty bullets array (BC-HONESTY-02 — no resume bullets in a cover letter)", () => {
    const doc = buildGroundedCoverLetterDocument({ paragraphs: verifiedParagraphs });
    expect(doc.bullets).toEqual([]);
  });

  it("produces a valid document even with a single verified paragraph", () => {
    const doc = buildGroundedCoverLetterDocument(
      { paragraphs: ["Один абзац."] },
      { greeting: "Доброго дня," },
    );
    expect(doc.coverLetter?.paragraphs).toEqual(["Доброго дня,", "Один абзац."]);
  });
});
