// Pure, tolerant parsers/validators for the two model responses (TC-PURE-01).
// They never throw on malformed output — every failure path returns a typed
// { ok: false, error } so the pipeline can fail honestly (NFR-OBS-01).

import type {
  CareerStage,
  ExtractionResult,
  GeneratedBullet,
  GenerationResult,
  GroundingLabel,
  GroundingResult,
  GroundingVerdict,
  ParseResult,
  Requirement,
  SeniorityVerdict,
} from "./types";

const GROUNDING_LABELS: readonly GroundingLabel[] = [
  "grounded",
  "overclaim-risk",
];

const CAREER_STAGES: readonly CareerStage[] = ["junior", "mid", "senior"];

const EVIDENCE_KINDS = ["cv", "user-confirmed"] as const;
type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

function fail<T>(error: string): ParseResult<T> {
  return { ok: false, error };
}

function ok<T>(value: T): ParseResult<T> {
  return { ok: true, value };
}

/**
 * Extract a JSON object/array from raw model text. Tolerates Markdown code
 * fences and surrounding prose by slicing from the first `{`/`[` to its matching
 * last `}`/`]`. Returns `undefined` if no JSON candidate is present.
 */
function extractJson(raw: string): unknown | undefined {
  const withoutFences = raw.replace(/```(?:json)?/gi, "").trim();

  const firstBrace = withoutFences.indexOf("{");
  const firstBracket = withoutFences.indexOf("[");
  const starts = [firstBrace, firstBracket].filter((i) => i >= 0);
  if (starts.length === 0) return undefined;
  const start = Math.min(...starts);

  const openChar = withoutFences[start];
  const closeChar = openChar === "{" ? "}" : "]";
  const end = withoutFences.lastIndexOf(closeChar);
  if (end <= start) return undefined;

  const candidate = withoutFences.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// --- Pass 0: extraction response (FR-JD-01/02) ------------------------------

const IMPORTANCE_VALUES = ["must-have", "nice-to-have"] as const;

function normalizeImportance(value: unknown): Requirement["importance"] | undefined {
  const importance = asString(value)?.trim().toLowerCase();
  return IMPORTANCE_VALUES.find((v) => v === importance);
}

/**
 * Parse the extraction response into ranked requirements. Order in the array IS
 * the rank (FR-JD-01). An unknown importance maps conservatively to
 * `nice-to-have`; keywords fall back to the requirement text itself so the pure
 * scorer always has something to match on.
 */
export function parseExtractionResponse(
  raw: string,
): ParseResult<ExtractionResult> {
  const root = extractJson(raw);
  if (root === undefined) return fail("Відповідь не містить валідного JSON");
  if (!isObject(root)) return fail("Очікувався JSON-обʼєкт з полем requirements");

  const rawRequirements = root["requirements"];
  if (!Array.isArray(rawRequirements)) {
    return fail("Поле requirements відсутнє або не є масивом");
  }
  if (rawRequirements.length === 0) {
    return fail("Список requirements порожній");
  }

  const requirements: Requirement[] = [];
  for (const [index, entry] of rawRequirements.entries()) {
    if (!isObject(entry)) {
      return fail(`Вимога ${index} не є обʼєктом`);
    }
    const text = asString(entry["text"])?.trim();
    if (!text) {
      return fail(`Вимога ${index} не має тексту`);
    }
    const id = asString(entry["id"])?.trim() || `r${index + 1}`;
    // Never over-trust the model: unknown importance is only "nice-to-have".
    const importance = normalizeImportance(entry["importance"]) ?? "nice-to-have";
    const rawKeywords = entry["keywords"];
    const keywords = Array.isArray(rawKeywords)
      ? rawKeywords
          .map((k) => asString(k)?.trim())
          .filter((k): k is string => Boolean(k))
      : [];

    requirements.push({
      id,
      text,
      importance,
      keywords: keywords.length > 0 ? keywords : [text],
    });
  }

  return ok({ requirements });
}

// --- Seniority response (analysis phase) ----------------------------------

function normalizeStage(value: unknown): CareerStage | undefined {
  const stage = asString(value)?.trim().toLowerCase();
  return CAREER_STAGES.find((s) => s === stage);
}

/**
 * Parse the seniority response into a typed verdict. An unknown/invalid stage
 * maps conservatively to `junior` — never over-trust the model into inflating
 * seniority (the honest default, mirroring parse-grounding's stance). A missing
 * rationale yields a typed error so the tolerant caller can drop the signal.
 */
export function parseSeniorityResponse(
  raw: string,
): ParseResult<SeniorityVerdict> {
  const root = extractJson(raw);
  if (root === undefined) return fail("Відповідь не містить валідного JSON");
  if (!isObject(root)) return fail("Очікувався JSON-обʼєкт з полем stage");

  const rationale = asString(root["rationale"])?.trim();
  if (!rationale) return fail("Вердикт не має обґрунтування (rationale)");

  // Unknown/invalid stage → junior: never over-trust the model into inflation.
  const stage = normalizeStage(root["stage"]) ?? "junior";

  return ok({ stage, rationale });
}

// --- Pass 1: generation response ------------------------------------------

/**
 * Parse the generation response into typed bullets. Malformed JSON, a missing
 * `bullets` array, or entries without usable text yield a typed error.
 */
export function parseGenerationResponse(
  raw: string,
): ParseResult<GenerationResult> {
  const root = extractJson(raw);
  if (root === undefined) return fail("Відповідь не містить валідного JSON");
  if (!isObject(root)) return fail("Очікувався JSON-обʼєкт з полем bullets");

  const rawBullets = root["bullets"];
  if (!Array.isArray(rawBullets)) {
    return fail("Поле bullets відсутнє або не є масивом");
  }

  const bullets: GeneratedBullet[] = [];
  for (const [index, entry] of rawBullets.entries()) {
    if (!isObject(entry)) {
      return fail(`Пункт ${index} не є обʼєктом`);
    }
    const text = asString(entry["text"])?.trim();
    if (!text) {
      return fail(`Пункт ${index} не має тексту`);
    }
    const id = asString(entry["id"])?.trim() || `b${index + 1}`;
    const sourceSentence = asString(entry["sourceSentence"])?.trim();

    bullets.push(
      sourceSentence
        ? { id, text, sourceSentence }
        : { id, text },
    );
  }

  return ok({ bullets });
}

// --- Pass 2: grounding response -------------------------------------------

function normalizeLabel(value: unknown): GroundingLabel | undefined {
  const label = asString(value)?.trim().toLowerCase();
  return GROUNDING_LABELS.find((l) => l === label);
}

function normalizeEvidenceKind(value: unknown): EvidenceKind | undefined {
  const kind = asString(value)?.trim().toLowerCase();
  return EVIDENCE_KINDS.find((k) => k === kind);
}

/**
 * Parse the grounding response into typed verdicts. An unknown label maps
 * conservatively to `overclaim-risk` (honest default). Malformed JSON, a
 * missing `verdicts` array, or entries without a `bulletId` yield a typed error.
 * `evidenceKind` (BC-HONESTY-03) is tolerant like every other field here: an
 * absent or unrecognized value is left out of the verdict rather than forced,
 * since `GroundingVerdict`'s own contract (types.ts) already treats an absent
 * `evidenceKind` as "cv" — this keeps pre-BC-HONESTY-03 fixtures byte-equal.
 */
export function parseGroundingResponse(
  raw: string,
): ParseResult<GroundingResult> {
  const root = extractJson(raw);
  if (root === undefined) return fail("Відповідь не містить валідного JSON");
  if (!isObject(root)) return fail("Очікувався JSON-обʼєкт з полем verdicts");

  const rawVerdicts = root["verdicts"];
  if (!Array.isArray(rawVerdicts)) {
    return fail("Поле verdicts відсутнє або не є масивом");
  }

  const verdicts: GroundingVerdict[] = [];
  for (const [index, entry] of rawVerdicts.entries()) {
    if (!isObject(entry)) {
      return fail(`Вердикт ${index} не є обʼєктом`);
    }
    const bulletId = asString(entry["bulletId"])?.trim();
    if (!bulletId) {
      return fail(`Вердикт ${index} не має bulletId`);
    }
    // Unknown/invalid label → overclaim-risk: never over-trust the model.
    const label = normalizeLabel(entry["label"]) ?? "overclaim-risk";
    const evidence =
      label === "grounded" ? asString(entry["evidence"])?.trim() : undefined;
    const evidenceKind = evidence
      ? normalizeEvidenceKind(entry["evidenceKind"])
      : undefined;

    verdicts.push({
      bulletId,
      label,
      ...(evidence ? { evidence } : {}),
      ...(evidenceKind ? { evidenceKind } : {}),
    });
  }

  return ok({ verdicts });
}
