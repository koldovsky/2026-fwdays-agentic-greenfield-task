// Pure, tolerant parsers/validators for the two model responses (TC-PURE-01).
// They never throw on malformed output — every failure path returns a typed
// { ok: false, error } so the pipeline can fail honestly (NFR-OBS-01).

import type {
  ExtractionResult,
  GeneratedBullet,
  GenerationResult,
  GroundingLabel,
  GroundingResult,
  GroundingVerdict,
  ParseResult,
  Requirement,
} from "./types";

const GROUNDING_LABELS: readonly GroundingLabel[] = [
  "grounded",
  "overclaim-risk",
];

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

/**
 * Parse the grounding response into typed verdicts. An unknown label maps
 * conservatively to `overclaim-risk` (honest default). Malformed JSON, a
 * missing `verdicts` array, or entries without a `bulletId` yield a typed error.
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

    verdicts.push(
      evidence ? { bulletId, label, evidence } : { bulletId, label },
    );
  }

  return ok({ verdicts });
}
