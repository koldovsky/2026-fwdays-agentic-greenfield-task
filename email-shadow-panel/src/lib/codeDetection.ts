const NUMERIC_CODE_PATTERN = /\b\d{4,8}\b/gu;
const SEPARATED_NUMERIC_CODE_PATTERN = /\b\d{3,4}[-\s]\d{3,4}\b/gu;
const ALPHANUMERIC_CODE_PATTERN = /\b[A-Z0-9]{6,8}\b/gu;
const CONTEXT_WINDOW = 48;

const CONTEXT_HINTS = [
  "code",
  "otp",
  "passcode",
  "verification",
  "verify",
  "security",
  "login",
  "sign in",
  "one-time",
] as const;

const PHONE_PATTERN = /^\d{9,}$/u;
const TIME_PATTERN = /^\d{1,2}:\d{2}$/u;
const DATE_SEGMENT_PATTERN = /^\d{4}$/u;

function normalize(input: string): string {
  return input.replace(/\r\n?/gu, "\n");
}

function contextScore(source: string, index: number): number {
  const start = Math.max(0, index - CONTEXT_WINDOW);
  const end = Math.min(source.length, index + CONTEXT_WINDOW);
  const context = source.slice(start, end).toLowerCase();

  return CONTEXT_HINTS.reduce((score, hint) => score + (context.includes(hint) ? 2 : 0), 0);
}

function isLikelyFalsePositive(candidate: string, source: string, index: number): boolean {
  const compactCandidate = candidate.replace(/[-\s]/gu, "");
  if (TIME_PATTERN.test(candidate)) {
    return true;
  }

  if (PHONE_PATTERN.test(compactCandidate)) {
    return true;
  }

  const before = source.slice(Math.max(0, index - 2), index);
  const after = source.slice(index + candidate.length, index + candidate.length + 2);
  if ((before === "+" || before === "(") && /\d/u.test(after)) {
    return true;
  }

  if (compactCandidate.length === 4 && DATE_SEGMENT_PATTERN.test(compactCandidate)) {
    const nearby = source.slice(Math.max(0, index - 5), index + candidate.length + 5);
    if (/[/-]/u.test(nearby)) {
      return true;
    }
  }

  return false;
}

export function detectCode(text: string | undefined | null): string | null {
  if (!text) {
    return null;
  }

  const source = normalize(text);
  const ranked: Array<{ candidate: string; score: number; index: number }> = [];

  for (const match of source.matchAll(NUMERIC_CODE_PATTERN)) {
    const candidate = match[0];
    const index = match.index ?? 0;
    if (isLikelyFalsePositive(candidate, source, index)) {
      continue;
    }

    const score =
      contextScore(source, index) +
      (candidate.length === 6 ? 5 : 3) +
      (candidate.length === 4 || candidate.length === 8 ? 1 : 0);
    ranked.push({ candidate, score, index });
  }

  for (const match of source.matchAll(SEPARATED_NUMERIC_CODE_PATTERN)) {
    const candidate = match[0].replace(/\s+/gu, "-");
    const compactCandidate = candidate.replace(/-/gu, "");
    const index = match.index ?? 0;
    if (isLikelyFalsePositive(candidate, source, index)) {
      continue;
    }

    const score =
      contextScore(source, index) +
      (compactCandidate.length === 6 ? 5 : 3) +
      (compactCandidate.length === 8 ? 1 : 0);
    ranked.push({ candidate, score, index });
  }

  for (const match of source.matchAll(ALPHANUMERIC_CODE_PATTERN)) {
    const candidate = match[0];
    const index = match.index ?? 0;
    if (!/[A-Z]/u.test(candidate) || !/\d/u.test(candidate)) {
      continue;
    }

    const score = contextScore(source, index);
    if (score < 2) {
      continue;
    }

    ranked.push({ candidate, score: score + 2, index });
  }

  ranked.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (left.candidate.length !== right.candidate.length) {
      return Math.abs(left.candidate.length - 6) - Math.abs(right.candidate.length - 6);
    }

    return left.index - right.index;
  });

  return ranked[0]?.candidate ?? null;
}
