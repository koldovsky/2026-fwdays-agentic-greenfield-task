import assert from "node:assert/strict";
import test from "node:test";

import {
  applyResponseCookies,
  createEmptyCookieJar,
  deserializeCookieJar,
  extractSetCookieHeaders,
  extractXsrfToken,
  listCookieNames,
  serializeCookieJar,
} from "../../server/providers/emailnator/cookies.server.ts";
import { redactStateDiagnostics } from "../../server/providers/emailnator/provider.server.ts";
import type { EmailnatorProviderState } from "../../server/providers/emailnator/schemas.server.ts";

test("extractSetCookieHeaders returns multiple cookie values in order", () => {
  const headers = new Headers();
  headers.append("set-cookie", "a=1; Path=/");
  headers.append("set-cookie", "b=2; Path=/");

  assert.deepEqual(extractSetCookieHeaders(headers), ["a=1; Path=/", "b=2; Path=/"]);
});

test("extractSetCookieHeaders fails clearly when the runtime lacks getSetCookie", () => {
  assert.throws(() => extractSetCookieHeaders({}), /Headers\.getSetCookie\(\)/);
});

test("cookie rotation, deletion, serialization, and restoration behave as expected", async () => {
  const jar = createEmptyCookieJar();
  const initialHeaders = new Headers();
  initialHeaders.append("set-cookie", "gmailnator_session=first; Path=/; HttpOnly");
  initialHeaders.append("set-cookie", "XSRF-TOKEN=token-one; Path=/");
  await applyResponseCookies(jar, initialHeaders, "https://www.emailnator.com/");

  const rotatedHeaders = new Headers();
  rotatedHeaders.append("set-cookie", "gmailnator_session=second; Path=/; HttpOnly");
  rotatedHeaders.append("set-cookie", "XSRF-TOKEN=token-two; Path=/");
  rotatedHeaders.append("set-cookie", "obsolete=gone; Max-Age=0; Path=/");
  await applyResponseCookies(jar, rotatedHeaders, "https://www.emailnator.com/");

  const serialized = serializeCookieJar(jar);
  const restored = deserializeCookieJar(serialized);
  const cookieNames = await listCookieNames(restored, "https://www.emailnator.com/");
  const xsrfToken = await extractXsrfToken(restored, "https://www.emailnator.com/");

  assert.deepEqual(cookieNames, ["XSRF-TOKEN", "gmailnator_session"]);
  assert.equal(xsrfToken, "token-two");
});

test("redacted diagnostics omit raw cookie and inbox values", async () => {
  const jar = createEmptyCookieJar();
  const headers = new Headers();
  headers.append("set-cookie", "gmailnator_session=live-like-value; Path=/; HttpOnly");
  headers.append("set-cookie", "XSRF-TOKEN=live-like-xsrf; Path=/");
  await applyResponseCookies(jar, headers, "https://www.emailnator.com/");

  const state: EmailnatorProviderState = {
    version: 1,
    address: "shadow.panel.001@gmail.com",
    cookieJar: serializeCookieJar(jar),
    observedCookieNames: ["gmailnator_session", "XSRF-TOKEN"],
    xsrfCookieName: "XSRF-TOKEN",
    xsrfHeaderName: "X-XSRF-TOKEN",
  };

  const diagnostics = await redactStateDiagnostics(state);

  assert.equal(diagnostics.xsrfPresent, true);
  assert.equal(diagnostics.addressDomain, "gmail.com");
  assert.notEqual(diagnostics.addressHash, state.address);
  assert.deepEqual(diagnostics.cookieNames, ["XSRF-TOKEN", "gmailnator_session"]);
});
