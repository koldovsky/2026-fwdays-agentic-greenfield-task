import { CookieJar } from "tough-cookie";

import { EmailnatorError } from "./errors.server.ts";
import type { EmailnatorProviderState } from "./schemas.server.ts";

export type SetCookieSource = {
  getSetCookie?: (() => string[]) | undefined;
};

export function extractSetCookieHeaders(headers: SetCookieSource): string[] {
  if (typeof headers.getSetCookie !== "function") {
    throw new EmailnatorError(
      "UNSUPPORTED_RUNTIME",
      "This runtime does not expose Headers.getSetCookie(). Pin Node 22.x for Phase 0.",
      { status: 500 },
    );
  }

  return headers.getSetCookie();
}

export async function applyResponseCookies(
  jar: CookieJar,
  headers: SetCookieSource,
  url: string,
): Promise<string[]> {
  const values = extractSetCookieHeaders(headers);

  for (const value of values) {
    await jar.setCookie(value, url);
  }

  return values;
}

export async function buildCookieHeader(jar: CookieJar, url: string): Promise<string | null> {
  const cookieHeader = await jar.getCookieString(url);
  return cookieHeader.length > 0 ? cookieHeader : null;
}

export async function listCookieNames(jar: CookieJar, url: string): Promise<string[]> {
  const cookies = await jar.getCookies(url);
  return [...new Set(cookies.map((cookie) => cookie.key))].sort();
}

export async function extractXsrfToken(
  jar: CookieJar,
  url: string,
  cookieName = "XSRF-TOKEN",
): Promise<string | null> {
  const cookies = await jar.getCookies(url);
  const match = cookies.find((cookie) => cookie.key === cookieName);
  return match ? decodeURIComponent(match.value) : null;
}

export function serializeCookieJar(jar: CookieJar): Record<string, unknown> {
  return jar.serializeSync() as Record<string, unknown>;
}

export function deserializeCookieJar(serialized: EmailnatorProviderState["cookieJar"]): CookieJar {
  return CookieJar.deserializeSync(serialized as never);
}

export function createEmptyCookieJar(): CookieJar {
  return new CookieJar();
}
