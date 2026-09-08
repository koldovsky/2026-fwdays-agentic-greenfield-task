function normalizeSender(value: string): string[] {
  return value
    .replace(/<.*?>/gu, " ")
    .replace(/["'()[\]{}]/gu, " ")
    .trim()
    .split(/[\s._/-]+/u)
    .map((token) => token.replace(/[^A-Za-z0-9]+/gu, ""))
    .filter(Boolean);
}

export function getSenderInitials(sender: string): string {
  const tokens = normalizeSender(sender);
  if (tokens.length === 0) {
    return "?";
  }

  const [first, second] = tokens;
  if (first && tokens.length > 1 && /^[A-Z0-9]{2}$/u.test(first)) {
    return first;
  }

  if (first && second) {
    return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
  }

  return first.slice(0, 2).toUpperCase();
}
