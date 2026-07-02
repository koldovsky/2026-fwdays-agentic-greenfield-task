import { describe, expect, it } from "vitest";

import { parseGenerationResponse, parseGroundingResponse } from "./index";

describe("parseGenerationResponse (FR-TAILOR-02)", () => {
  it("parses valid JSON with id, text, sourceSentence", () => {
    const res = parseGenerationResponse(
      '{"bullets":[{"id":"b1","text":"Розробив API","sourceSentence":"Писав бекенд"}]}',
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.bullets).toEqual([
      { id: "b1", text: "Розробив API", sourceSentence: "Писав бекенд" },
    ]);
  });

  it("tolerates Markdown code fences and surrounding prose", () => {
    const raw = 'Ось результат:\n```json\n{"bullets":[{"id":"b1","text":"Пункт"}]}\n```\nДякую';
    const res = parseGenerationResponse(raw);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.bullets[0]).toEqual({ id: "b1", text: "Пункт" });
  });

  it("synthesizes a bullet id when missing", () => {
    const res = parseGenerationResponse('{"bullets":[{"text":"Пункт"}]}');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.bullets[0].id).toBe("b1");
  });

  it("returns a typed error on malformed JSON (never throws)", () => {
    const res = parseGenerationResponse("this is not json at all");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.length).toBeGreaterThan(0);
  });

  it("returns a typed error when bullets is missing", () => {
    const res = parseGenerationResponse('{"foo":1}');
    expect(res.ok).toBe(false);
  });

  it("returns a typed error when a bullet has no text", () => {
    const res = parseGenerationResponse('{"bullets":[{"id":"b1"}]}');
    expect(res.ok).toBe(false);
  });
});

describe("parseGroundingResponse (FR-BULLETS-03, FR-BULLETS-01, BC-HONESTY-01)", () => {
  it("parses grounded and overclaim-risk verdicts", () => {
    const res = parseGroundingResponse(
      '{"verdicts":[{"bulletId":"b1","label":"grounded","evidence":"Писав бекенд"},{"bulletId":"b2","label":"overclaim-risk"}]}',
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.verdicts).toEqual([
      { bulletId: "b1", label: "grounded", evidence: "Писав бекенд" },
      { bulletId: "b2", label: "overclaim-risk" },
    ]);
  });

  it("maps the overclaim-risk label through unchanged", () => {
    const res = parseGroundingResponse(
      '{"verdicts":[{"bulletId":"b1","label":"overclaim-risk","evidence":"ignored"}]}',
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    // Evidence is dropped for non-grounded verdicts.
    expect(res.value.verdicts[0]).toEqual({
      bulletId: "b1",
      label: "overclaim-risk",
    });
  });

  it("defaults an unknown label to overclaim-risk (never over-trusts)", () => {
    const res = parseGroundingResponse(
      '{"verdicts":[{"bulletId":"b1","label":"probably-fine"}]}',
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.verdicts[0].label).toBe("overclaim-risk");
  });

  it("is case-insensitive for labels", () => {
    const res = parseGroundingResponse(
      '{"verdicts":[{"bulletId":"b1","label":"GROUNDED","evidence":"x"}]}',
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.verdicts[0].label).toBe("grounded");
  });

  it("returns a typed error on malformed JSON (never throws)", () => {
    const res = parseGroundingResponse("<<< not json >>>");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.length).toBeGreaterThan(0);
  });

  it("returns a typed error when a verdict has no bulletId", () => {
    const res = parseGroundingResponse('{"verdicts":[{"label":"grounded"}]}');
    expect(res.ok).toBe(false);
  });

  it("returns a typed error when verdicts is missing", () => {
    const res = parseGroundingResponse('{"nope":true}');
    expect(res.ok).toBe(false);
  });
});
