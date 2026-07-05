// Lightweight OTP / verification code detection over plain text bodies.
// Runs entirely on the client for the prototype; in production the same
// logic could live server-side alongside the provider adapter.

const CONTEXT_PATTERNS: RegExp[] = [
  /(?:verification\s*code|verify\s*code|security\s*code|one[-\s]?time\s*(?:code|password)|otp|passcode|access\s*code|login\s*code|confirm(?:ation)?\s*code|your\s*code\s*is)\D{0,20}(\d{4,8})/i,
  /\bcode[:\s-]+(\d{4,8})\b/i,
];

const BARE_PATTERN = /\b(\d{6})\b/;

export function detectCode(text: string | undefined | null): string | null {
  if (!text) return null;
  for (const re of CONTEXT_PATTERNS) {
    const m = text.match(re);
    if (m && m[1]) return m[1];
  }
  const bare = text.match(BARE_PATTERN);
  if (bare) return bare[1];
  return null;
}
