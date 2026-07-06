import { describe, expect, it } from "vitest";

import {
  parseCoverLetterResponse,
  parseCoverLetterVerdict,
  parseGenerationResponse,
  parseGroundingResponse,
  parseSeniorityResponse,
} from "./index";

describe("parseCoverLetterResponse (§4, NFR-OBS-01)", () => {
  it("parses ordered non-empty paragraphs", () => {
    const res = parseCoverLetterResponse('{"paragraphs":["Доброго дня","Маю досвід з React"]}');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.paragraphs).toEqual(["Доброго дня", "Маю досвід з React"]);
  });

  it("drops empty/whitespace paragraphs and trims", () => {
    const res = parseCoverLetterResponse('{"paragraphs":["  Текст  ","","   "]}');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.paragraphs).toEqual(["Текст"]);
  });

  it("fails when paragraphs is missing, all-empty, or malformed (no blank export)", () => {
    expect(parseCoverLetterResponse('{"paragraphs":[]}').ok).toBe(false);
    expect(parseCoverLetterResponse('{"paragraphs":["",""]}').ok).toBe(false);
    expect(parseCoverLetterResponse("garbage").ok).toBe(false);
  });
});

describe("parseCoverLetterVerdict (T5 §3.2, BC-HONESTY-01/02, NFR-OBS-01)", () => {
  it("parses a clean supported=true verdict with an empty unsupportedClaims array", () => {
    const res = parseCoverLetterVerdict('{"supported":true,"unsupportedClaims":[]}');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.supported).toBe(true);
    expect(res.value.unsupportedClaims).toEqual([]);
  });

  it("parses a rejected verdict with listed unsupported claims", () => {
    const res = parseCoverLetterVerdict(
      '{"supported":false,"unsupportedClaims":["вигаданий факт","Ще один вигаданий факт"]}',
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.supported).toBe(false);
    expect(res.value.unsupportedClaims).toEqual(["вигаданий факт", "Ще один вигаданий факт"]);
  });

  it("treats supported=true WITH unsupportedClaims as NOT supported (contradiction, BC-HONESTY-01)", () => {
    // The model says supported:true but lists an unsupported claim — a
    // contradiction that must never let an overclaim through. The parser
    // normalizes `supported` to false.
    const res = parseCoverLetterVerdict(
      '{"supported":true,"unsupportedClaims":["вигаданий факт"]}',
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.supported).toBe(false);
    expect(res.value.unsupportedClaims).toEqual(["вигаданий факт"]);
  });

  it("tolerates a missing unsupportedClaims field — defaults to empty array", () => {
    const res = parseCoverLetterVerdict('{"supported":true}');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.supported).toBe(true);
    expect(res.value.unsupportedClaims).toEqual([]);
  });

  it("tolerates Markdown fences and surrounding prose (NFR-OBS-01)", () => {
    const raw =
      'Перевірка:\n```json\n{"supported":false,"unsupportedClaims":["x"]}\n```\nОбґрунтування нижче.';
    const res = parseCoverLetterVerdict(raw);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.supported).toBe(false);
  });

  it("filters empty/whitespace strings from unsupportedClaims", () => {
    const res = parseCoverLetterVerdict(
      '{"supported":false,"unsupportedClaims":["  ","","реальна претензія"]}',
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.unsupportedClaims).toEqual(["реальна претензія"]);
  });

  it("returns a typed error when supported field is absent (never throws)", () => {
    const res = parseCoverLetterVerdict('{"unsupportedClaims":[]}');
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.length).toBeGreaterThan(0);
  });

  it("returns a typed error when supported is a non-boolean string (never throws)", () => {
    const res = parseCoverLetterVerdict('{"supported":"yes","unsupportedClaims":[]}');
    expect(res.ok).toBe(false);
  });

  it("returns a typed error on malformed JSON — never throws", () => {
    const res = parseCoverLetterVerdict("not json at all");
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.length).toBeGreaterThan(0);
  });

  it("returns a typed error on empty input — never throws", () => {
    const res = parseCoverLetterVerdict("");
    expect(res.ok).toBe(false);
  });

  it("is pure — same input yields identical output (TC-PURE-01)", () => {
    const input = '{"supported":true,"unsupportedClaims":[]}';
    expect(parseCoverLetterVerdict(input)).toEqual(parseCoverLetterVerdict(input));
  });
});

describe("parseSeniorityResponse (§3, BC-HONESTY-01, NFR-OBS-01)", () => {
  it("parses a valid stage + rationale", () => {
    const res = parseSeniorityResponse('{"stage":"senior","rationale":"10 років досвіду з лідерством"}');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value).toEqual({ stage: "senior", rationale: "10 років досвіду з лідерством" });
  });

  it("tolerates Markdown fences and surrounding prose", () => {
    const raw = 'Ось:\n```json\n{"stage":"mid","rationale":"кілька проєктів"}\n```';
    const res = parseSeniorityResponse(raw);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.stage).toBe("mid");
  });

  it("maps an unknown/invalid stage conservatively to junior (never inflate)", () => {
    const res = parseSeniorityResponse('{"stage":"principal","rationale":"багато досвіду"}');
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.stage).toBe("junior");
  });

  it("fails (typed error) when the rationale is missing — no bare stage", () => {
    const res = parseSeniorityResponse('{"stage":"senior"}');
    expect(res.ok).toBe(false);
  });

  it("never throws on malformed JSON — returns a typed error", () => {
    const res = parseSeniorityResponse("not json at all");
    expect(res.ok).toBe(false);
  });
});

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

describe("parseGroundingResponse evidenceKind (BC-HONESTY-03)", () => {
  it("parses evidenceKind cv", () => {
    const res = parseGroundingResponse(
      '{"verdicts":[{"bulletId":"b1","label":"grounded","evidence":"Писав бекенд","evidenceKind":"cv"}]}',
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.verdicts[0]).toEqual({
      bulletId: "b1",
      label: "grounded",
      evidence: "Писав бекенд",
      evidenceKind: "cv",
    });
  });

  it("parses evidenceKind user-confirmed", () => {
    const res = parseGroundingResponse(
      '{"verdicts":[{"bulletId":"b1","label":"grounded","evidence":"Відповідь кандидата","evidenceKind":"user-confirmed"}]}',
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.verdicts[0]).toEqual({
      bulletId: "b1",
      label: "grounded",
      evidence: "Відповідь кандидата",
      evidenceKind: "user-confirmed",
    });
  });

  it("defaults an absent evidenceKind to cv (omitted from the verdict, per types.ts contract)", () => {
    const res = parseGroundingResponse(
      '{"verdicts":[{"bulletId":"b1","label":"grounded","evidence":"Писав бекенд"}]}',
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.verdicts[0]).toEqual({
      bulletId: "b1",
      label: "grounded",
      evidence: "Писав бекенд",
    });
    expect(res.value.verdicts[0].evidenceKind).toBeUndefined();
  });

  it("defaults an invalid/garbage evidenceKind to cv (never throws, never over-trusts)", () => {
    const res = parseGroundingResponse(
      '{"verdicts":[{"bulletId":"b1","label":"grounded","evidence":"Писав бекенд","evidenceKind":"telepathy"}]}',
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.verdicts[0]).toEqual({
      bulletId: "b1",
      label: "grounded",
      evidence: "Писав бекенд",
    });
    expect(res.value.verdicts[0].evidenceKind).toBeUndefined();
  });
});
