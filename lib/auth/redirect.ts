/**
 * Validate a post-sign-in redirect target (FR-AUTH-01). Pure (TC-PURE-01).
 * Only a same-origin, relative path is allowed, so a crafted `next` can never
 * turn the redirect into an open redirect to another host. Anything else falls
 * back to the cabinet root.
 */
export const DEFAULT_NEXT = "/";

export function safeNextPath(raw: string | null | undefined): string {
  if (typeof raw !== "string" || raw.length === 0) {
    return DEFAULT_NEXT;
  }
  // Must be a path rooted at "/", but not "//host" or "/\host" (protocol-relative),
  // and must carry no scheme, backslashes, or control characters.
  if (!raw.startsWith("/")) {
    return DEFAULT_NEXT;
  }
  if (raw.startsWith("//") || raw.startsWith("/\\")) {
    return DEFAULT_NEXT;
  }
  if (raw.includes("\\") || /[\x00-\x1f]/.test(raw)) {
    return DEFAULT_NEXT;
  }
  if (/^\/+[a-z][a-z0-9+.-]*:/i.test(raw)) {
    return DEFAULT_NEXT;
  }
  return raw;
}
