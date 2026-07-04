// §4: the cover-letter builder assembles prose from the tailoring's grounded,
// kept bullets and NEVER re-derives overclaim exclusion — an excluded
// overclaim-risk bullet must not reach the letter (BC-HONESTY-02, §4 scenario).
import type { Bullet } from "@/entities/bullet";
import { describe, expect, it } from "vitest";

import { buildCoverLetterDocument } from "./build-document";

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
