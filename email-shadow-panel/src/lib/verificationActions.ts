export type MessageDetailStatus = "idle" | "loading" | "loaded" | "error";

export interface VerificationLink {
  url: string;
  hostname: string;
}

export type VerificationActionsPanelState =
  | {
      kind: "actions";
      code: string | null;
      link: VerificationLink | null;
    }
  | {
      kind: "empty";
      title: string;
      description: string;
    };

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/giu;
const HREF_PATTERN = /\bhref=["'](https?:\/\/[^"']+)["']/giu;
const TRAILING_PUNCTUATION_PATTERN = /[),.;\]}]+$/u;
const HTML_ENTITY_AMPERSAND_PATTERN = /&amp;/giu;
const CONTEXT_WINDOW = 96;

const LINK_CONTEXT_HINTS = [
  "verify",
  "verification",
  "confirm",
  "confirmation",
  "activate",
  "magic",
  "login",
  "sign in",
  "account",
  "email",
] as const;

function cleanUrlCandidate(value: string): string {
  return value
    .replace(HTML_ENTITY_AMPERSAND_PATTERN, "&")
    .replace(TRAILING_PUNCTUATION_PATTERN, "");
}

function scoreLinkCandidate(source: string, rawUrl: string, index: number): number {
  const start = Math.max(0, index - CONTEXT_WINDOW);
  const end = Math.min(source.length, index + rawUrl.length + CONTEXT_WINDOW);
  const context = `${source.slice(start, end)} ${rawUrl}`.toLowerCase();

  return LINK_CONTEXT_HINTS.reduce((score, hint) => score + (context.includes(hint) ? 2 : 0), 0);
}

function toVerificationLink(candidate: string): VerificationLink | null {
  try {
    const parsed = new URL(cleanUrlCandidate(candidate));
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }

    return {
      url: parsed.toString(),
      hostname: parsed.hostname,
    };
  } catch {
    return null;
  }
}

export function extractSafeLinks(text: string | null | undefined): VerificationLink[] {
  if (typeof text !== "string" || text.trim().length === 0) {
    return [];
  }

  const candidates: Array<{ link: VerificationLink; score: number; index: number }> = [];

  for (const match of text.matchAll(HREF_PATTERN)) {
    const rawUrl = match[1] ?? "";
    const index = match.index ?? 0;
    const link = toVerificationLink(rawUrl);
    if (!link) {
      continue;
    }

    candidates.push({
      link,
      score: scoreLinkCandidate(text, rawUrl, index) + 2,
      index,
    });
  }

  for (const match of text.matchAll(URL_PATTERN)) {
    const rawUrl = match[0];
    const index = match.index ?? 0;
    const link = toVerificationLink(rawUrl);
    if (!link) {
      continue;
    }

    candidates.push({
      link,
      score: scoreLinkCandidate(text, rawUrl, index),
      index,
    });
  }

  candidates.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    return left.index - right.index;
  });

  const deduped = new Map<string, VerificationLink>();
  for (const candidate of candidates) {
    if (!deduped.has(candidate.link.url)) {
      deduped.set(candidate.link.url, candidate.link);
    }
  }

  return [...deduped.values()];
}

export function detectVerificationLink(text: string | null | undefined): VerificationLink | null {
  return extractSafeLinks(text)[0] ?? null;
}

export function getVerificationActionsPanelState(input: {
  code: string | null;
  link: VerificationLink | null;
  hasSelection: boolean;
  detailStatus: MessageDetailStatus;
  detailErrorMessage?: string | null;
}): VerificationActionsPanelState {
  if (input.code || input.link) {
    return {
      kind: "actions",
      code: input.code,
      link: input.link,
    };
  }

  if (!input.hasSelection) {
    return {
      kind: "empty",
      title: "Select a message",
      description: "Select a message to see verification actions.",
    };
  }

  if (input.detailStatus === "loading") {
    return {
      kind: "empty",
      title: "Checking message detail",
      description: "Loading the safe message text before looking for verification actions.",
    };
  }

  if (input.detailStatus === "error" || input.detailStatus === "idle") {
    return {
      kind: "empty",
      title: "Message content is not available for verification",
      description: "Message content is not available for verification.",
    };
  }

  return {
    kind: "empty",
    title: "No verification action detected",
    description: "This message does not contain a clear verification link or one-time code.",
  };
}
