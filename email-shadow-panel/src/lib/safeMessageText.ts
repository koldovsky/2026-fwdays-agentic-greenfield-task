export const SAFE_MESSAGE_TEXT_LIMIT = 20_000;

export interface PreparedMessageText {
  text: string;
  truncated: boolean;
}

export function prepareSafeMessageText(
  value: string,
  maxLength = SAFE_MESSAGE_TEXT_LIMIT,
): PreparedMessageText {
  const normalized = value
    .replace(/\r\n?/gu, "\n")
    .replace(/[^\S\n\t]+/gu, " ")
    .trim();
  if (normalized.length <= maxLength) {
    return {
      text: normalized,
      truncated: false,
    };
  }

  return {
    text: `${normalized.slice(0, maxLength)}\n\n[message truncated for safe preview]`,
    truncated: true,
  };
}
