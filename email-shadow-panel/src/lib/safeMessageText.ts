export const SAFE_MESSAGE_TEXT_LIMIT = 20_000;

export interface PreparedMessageBlock {
  kind: "metadata" | "paragraph" | "list";
  text: string;
  items?: string[];
}

export interface PreparedMessageText {
  text: string;
  paragraphs: string[];
  blocks: PreparedMessageBlock[];
  truncated: boolean;
}

const HEADER_KEYS = ["from", "to", "subject", "time", "date", "reply-to", "cc", "bcc"];
const HEADER_LINE_PATTERN = new RegExp(`^(?:${HEADER_KEYS.join("|")}):`, "iu");
const INLINE_HEADER_PATTERN = new RegExp(`\\s+(?=(?:${HEADER_KEYS.join("|")}):)`, "giu");
function expandInlineHeaderBreaks(value: string): string {
  const normalizedNewlines = value.replace(/\r\n?/gu, "\n");
  const trimmed = normalizedNewlines.trimStart();

  if (!HEADER_LINE_PATTERN.test(trimmed)) {
    return normalizedNewlines;
  }

  return normalizedNewlines.replace(INLINE_HEADER_PATTERN, "\n");
}

function normalizeSafeMessageText(value: string): string {
  return expandInlineHeaderBreaks(value)
    .replace(/[^\S\n\t]+/gu, " ")
    .replace(/\n[ \t]+/gu, "\n")
    .trim();
}

function isListLike(line: string): boolean {
  return /^([-*�]|\d+[.)])\s+/u.test(line);
}

function splitTrailingBodyFromMetadataLine(line: string): {
  metadataLine: string;
  bodyRemainder: string | null;
} {
  const normalized = line.replace(/\s{2,}/gu, " ").trim();
  const match = normalized.match(
    /^((?:From|To|Subject|Time|Date|Reply-To|Cc|Bcc):\s*[^.!?\n]{1,72}?)(?=\s+(?:Hello|Hi|Dear|Thanks|Thank you|Please|Use|Click|Welcome|If you|Alternatively)\b)/iu,
  );

  if (!match) {
    return { metadataLine: normalized, bodyRemainder: null };
  }

  return {
    metadataLine: match[1].trim(),
    bodyRemainder: normalized.slice(match[1].length).trim() || null,
  };
}

function splitFlowParagraph(text: string): string[] {
  const compact = text.replace(/\s{2,}/gu, " ").trim();
  if (!compact) {
    return [];
  }

  const sentences = compact
    .split(/(?<=[.!?])\s+(?=[A-Z0-9])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length < 4 && compact.length <= 260) {
    return [compact];
  }

  const chunkSize = sentences.length >= 6 ? 3 : 2;
  const grouped: string[] = [];

  for (let index = 0; index < sentences.length; index += chunkSize) {
    grouped.push(sentences.slice(index, index + chunkSize).join(" "));
  }

  return grouped;
}

function splitLeadingMetadata(lines: string[]): { metadata: string[]; body: string[] } {
  const metadata: string[] = [];
  const body: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const current = lines[index]?.trim() ?? "";
    if (!current) {
      index += 1;
      continue;
    }

    if (!HEADER_LINE_PATTERN.test(current)) {
      break;
    }

    const split = splitTrailingBodyFromMetadataLine(current);
    metadata.push(split.metadataLine);
    if (split.bodyRemainder) {
      body.push(split.bodyRemainder);
    }
    index += 1;
  }

  body.push(
    ...lines
      .slice(index)
      .map((line) => line.trim())
      .filter(Boolean),
  );

  return { metadata, body };
}

function createBodyBlocks(lines: string[]): PreparedMessageBlock[] {
  const blocks: PreparedMessageBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return;
    }

    const combined = paragraphLines
      .join(" ")
      .replace(/\s{2,}/gu, " ")
      .trim();
    paragraphLines = [];

    for (const paragraph of splitFlowParagraph(combined)) {
      blocks.push({ kind: "paragraph", text: paragraph });
    }
  };

  const flushList = () => {
    if (listItems.length === 0) {
      return;
    }

    blocks.push({ kind: "list", text: listItems.join("\n"), items: [...listItems] });
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    if (isListLike(line)) {
      flushParagraph();
      listItems.push(line.replace(/^([-*�]|\d+[.)])\s+/u, "").trim());
      continue;
    }

    flushList();
    paragraphLines.push(line);
  }

  flushParagraph();
  flushList();

  return blocks;
}

export function formatSafeMessageBlocks(value: string): PreparedMessageBlock[] {
  const normalized = normalizeSafeMessageText(value);
  if (!normalized) {
    return [];
  }

  return normalized.split(/\n{2,}/u).flatMap((block) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return [];
    }

    const { metadata, body } = splitLeadingMetadata(lines);
    const blocks: PreparedMessageBlock[] = [];

    if (metadata.length > 0) {
      blocks.push({ kind: "metadata", text: metadata.join("  �  ") });
    }

    blocks.push(...createBodyBlocks(body));
    return blocks;
  });
}

export function paragraphizeMessageText(value: string): string[] {
  return formatSafeMessageBlocks(value)
    .flatMap((block) => {
      if (block.kind === "list") {
        return block.items ?? [];
      }

      if (block.kind === "metadata") {
        return [block.text.replace(/\s+�\s+/gu, " ")];
      }

      return [block.text];
    })
    .map((paragraph) => paragraph.replace(/\s{2,}/gu, " ").trim())
    .filter(Boolean);
}

export function prepareSafeMessageText(
  value: string,
  maxLength = SAFE_MESSAGE_TEXT_LIMIT,
): PreparedMessageText {
  const normalized = normalizeSafeMessageText(value);
  const truncated = normalized.length > maxLength;
  const text = truncated
    ? `${normalized.slice(0, maxLength)}\n\n[message truncated for safe preview]`
    : normalized;
  const blocks = formatSafeMessageBlocks(text);

  return {
    text,
    paragraphs: blocks
      .flatMap((block) => {
        if (block.kind === "list") {
          return block.items ?? [];
        }

        if (block.kind === "metadata") {
          return [block.text.replace(/\s+�\s+/gu, " ")];
        }

        return [block.text];
      })
      .map((paragraph) => paragraph.replace(/\s{2,}/gu, " ").trim())
      .filter(Boolean),
    blocks,
    truncated,
  };
}
