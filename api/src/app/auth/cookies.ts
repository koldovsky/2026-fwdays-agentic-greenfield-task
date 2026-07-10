export const SESSION_COOKIE = 'sd_session';

// Minimal request-cookie parsing — enough for one opaque session token;
// avoids the cookie-parser dependency (BC-PRIN-01). Response cookies are
// set via Express's built-in res.cookie().
export function parseCookies(
  header: string | undefined,
): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const pair of header.split(';')) {
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    if (!name) continue;
    try {
      cookies[name] = decodeURIComponent(pair.slice(eq + 1).trim());
    } catch {
      // malformed percent-encoding — skip the cookie, never crash the guard
    }
  }
  return cookies;
}
