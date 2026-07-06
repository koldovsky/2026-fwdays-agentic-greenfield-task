import { CookieJar } from "tough-cookie";
import { z } from "zod";

import {
  applyResponseCookies,
  buildCookieHeader,
  createEmptyCookieJar,
  deserializeCookieJar,
  extractXsrfToken,
  listCookieNames,
  serializeCookieJar,
} from "./cookies.server.ts";
import { EmailnatorError } from "./errors.server.ts";
import {
  EMAILNATOR_BOOTSTRAP_PATH,
  EMAILNATOR_DEFAULT_GENERATION_MODE,
  EMAILNATOR_DEFAULT_TIMEOUT_MS,
  EMAILNATOR_FALLBACK_GENERATION_MODE,
  EMAILNATOR_GENERATE_PATH,
  EMAILNATOR_MAX_RESPONSE_BYTES,
  EMAILNATOR_MESSAGE_LIST_PATH,
  EMAILNATOR_ORIGIN,
  KNOWN_TEST_MARKERS,
  emailnatorGenerateResponseSchema,
  emailnatorMessageListResponseSchema,
  emailnatorProviderStateSchema,
  type EmailnatorGenerationMode,
  type EmailnatorMessageSummary,
  type EmailnatorProviderState,
} from "./schemas.server.ts";

export type FetchLike = typeof fetch;

export interface EmailnatorRuntime {
  fetchImpl?: FetchLike;
  now?: () => Date;
}

export interface GeneratedInboxResult {
  address: string;
  state: EmailnatorProviderState;
  diagnostics: RedactedStateDiagnostics;
}

export interface ListedInboxResult {
  messages: EmailnatorMessageSummary[];
  state: EmailnatorProviderState;
  diagnostics: RedactedStateDiagnostics;
}

export interface SanitizedDetailResult {
  contentType: string;
  bodyLength: number;
  text: string;
  textPreview: string;
  markerFound: boolean;
}

export interface MessageDetailResult {
  detail: SanitizedDetailResult;
  state: EmailnatorProviderState;
  diagnostics: RedactedStateDiagnostics;
}

export interface RedactedStateDiagnostics {
  cookieCount: number;
  cookieNames: string[];
  xsrfPresent: boolean;
  addressDomain: string | null;
  addressHash: string | null;
}

const bootstrapHtmlSchema = z
  .string()
  .min(1)
  .refine((html) => html.includes('id="root"') || html.includes("id='root'"), {
    message: "Bootstrap HTML is missing the root container.",
  });

function getFetch(runtime?: EmailnatorRuntime): FetchLike {
  return runtime?.fetchImpl ?? fetch;
}

function getNow(runtime?: EmailnatorRuntime): Date {
  return runtime?.now?.() ?? new Date();
}

function createProviderUrl(pathname: string): string {
  return new URL(pathname, EMAILNATOR_ORIGIN).toString();
}

function shouldRetryNetworkError(error: unknown): boolean {
  if (error instanceof EmailnatorError) {
    return false;
  }

  if (error instanceof DOMException) {
    return error.name !== "AbortError";
  }

  return error instanceof TypeError;
}

function isChallengeBody(body: string): boolean {
  const normalized = body.toLowerCase();
  return [
    "captcha",
    "access denied",
    "verify you are human",
    "temporarily blocked",
    "request unsuccessful",
    "forbidden",
  ].some((token) => normalized.includes(token));
}

function normalizeProviderHttpError(status: number, body: string): EmailnatorError {
  if (status === 403 || status === 429 || isChallengeBody(body)) {
    return new EmailnatorError(
      "PROVIDER_BLOCKED",
      "The provider returned a challenge or blocking response.",
      { status: 502 },
    );
  }

  return new EmailnatorError("PROVIDER_HTTP", `The provider returned HTTP ${status}.`, {
    status: 502,
  });
}

function parseJsonBody(body: string, context: string): unknown {
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new EmailnatorError("PROVIDER_RESPONSE_INVALID", `${context} was not valid JSON.`, {
      cause: error,
      status: 502,
    });
  }
}

function parseWithSchema<TOutput, TInput = unknown>(
  schema: z.ZodType<TOutput, z.ZodTypeDef, TInput>,
  value: TInput,
  context: string,
): TOutput {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new EmailnatorError(
      "PROVIDER_RESPONSE_INVALID",
      `${context} did not match the expected schema.`,
      {
        status: 502,
        details: {
          issues: parsed.error.issues.map((issue) => issue.message),
        },
      },
    );
  }

  return parsed.data;
}

async function readResponseText(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    if (value) {
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new EmailnatorError(
          "REQUEST_TOO_LARGE",
          `The provider response exceeded ${maxBytes} bytes.`,
          { status: 502 },
        );
      }
      chunks.push(value);
    }
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
}

async function performRequest(
  state: EmailnatorProviderState,
  pathname: string,
  options: {
    accept: string;
    method?: "GET" | "POST";
    jsonBody?: Record<string, unknown>;
    timeoutMs?: number;
    maxBytes?: number;
  },
  runtime?: EmailnatorRuntime,
): Promise<{
  body: string;
  contentType: string;
  state: EmailnatorProviderState;
}> {
  const fetchImpl = getFetch(runtime);
  const url = createProviderUrl(pathname);
  const jar = deserializeCookieJar(state.cookieJar);
  const method = options.method ?? "GET";
  const timeoutMs = options.timeoutMs ?? EMAILNATOR_DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? EMAILNATOR_MAX_RESPONSE_BYTES;
  const headers = new Headers({
    Accept: options.accept,
    "X-Requested-With": "XMLHttpRequest",
  });

  if (method === "POST") {
    headers.set("Content-Type", "application/json");
  }

  const cookieHeader = await buildCookieHeader(jar, url);
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  const xsrfToken = await extractXsrfToken(jar, url, state.xsrfCookieName);
  if (xsrfToken) {
    headers.set(state.xsrfHeaderName, xsrfToken);
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, {
        method,
        body: options.jsonBody ? JSON.stringify(options.jsonBody) : undefined,
        headers,
        redirect: "manual",
        signal: controller.signal,
      });

      await applyResponseCookies(jar, response.headers, url);
      const body = await readResponseText(response, maxBytes);
      const contentType = response.headers.get("content-type") ?? "application/octet-stream";

      if (!response.ok) {
        throw normalizeProviderHttpError(response.status, body);
      }

      if (isChallengeBody(body)) {
        throw new EmailnatorError(
          "PROVIDER_BLOCKED",
          "The provider returned a challenge or blocking response.",
          { status: 502 },
        );
      }

      return {
        body,
        contentType,
        state: await persistState(state, jar, runtime),
      };
    } catch (error) {
      if (attempt === 0 && shouldRetryNetworkError(error)) {
        continue;
      }

      if (error instanceof EmailnatorError) {
        throw error;
      }

      if (error instanceof DOMException && error.name === "AbortError") {
        throw new EmailnatorError("REQUEST_TIMEOUT", "The provider request timed out.", {
          cause: error,
          status: 504,
        });
      }

      throw new EmailnatorError("PROVIDER_HTTP", "The provider request failed.", {
        cause: error,
        status: 502,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new EmailnatorError("PROVIDER_HTTP", "The provider request failed.", { status: 502 });
}

async function persistState(
  state: EmailnatorProviderState,
  jar: CookieJar,
  runtime?: EmailnatorRuntime,
): Promise<EmailnatorProviderState> {
  const cookieNames = await listCookieNames(jar, EMAILNATOR_ORIGIN);
  return parseWithSchema(
    emailnatorProviderStateSchema,
    {
      ...state,
      cookieJar: serializeCookieJar(jar),
      observedCookieNames: cookieNames,
      lastUsedAt: getNow(runtime).toISOString(),
    },
    "Provider state",
  );
}

function hashAddress(address: string | undefined): string | null {
  if (!address) {
    return null;
  }

  return Buffer.from(address, "utf8").toString("base64url").slice(0, 12);
}

function addressDomain(address: string | undefined): string | null {
  if (!address) {
    return null;
  }

  const [, domain] = address.split("@");
  return domain ?? null;
}

export async function redactStateDiagnostics(
  state: EmailnatorProviderState,
): Promise<RedactedStateDiagnostics> {
  const jar = deserializeCookieJar(state.cookieJar);
  const cookieNames = await listCookieNames(jar, EMAILNATOR_ORIGIN);
  const xsrfToken = await extractXsrfToken(jar, EMAILNATOR_ORIGIN, state.xsrfCookieName);

  return {
    cookieCount: cookieNames.length,
    cookieNames,
    xsrfPresent: Boolean(xsrfToken),
    addressDomain: addressDomain(state.address),
    addressHash: hashAddress(state.address),
  };
}

export function createEmptyProviderState(): EmailnatorProviderState {
  return parseWithSchema(
    emailnatorProviderStateSchema,
    {
      version: 1,
      cookieJar: serializeCookieJar(createEmptyCookieJar()),
      observedCookieNames: [],
      xsrfCookieName: "XSRF-TOKEN",
      xsrfHeaderName: "X-XSRF-TOKEN",
    },
    "Initial provider state",
  );
}

export async function bootstrapProviderSession(
  inputState?: EmailnatorProviderState,
  runtime?: EmailnatorRuntime,
): Promise<EmailnatorProviderState> {
  const state = inputState ?? createEmptyProviderState();
  const result = await performRequest(
    state,
    EMAILNATOR_BOOTSTRAP_PATH,
    {
      accept: "text/html,application/xhtml+xml",
      method: "GET",
    },
    runtime,
  );

  parseWithSchema(bootstrapHtmlSchema, result.body, "Bootstrap HTML");
  return parseWithSchema(
    emailnatorProviderStateSchema,
    {
      ...result.state,
      lastBootstrapAt: getNow(runtime).toISOString(),
    },
    "Bootstrapped provider state",
  );
}

function expectedGeneratedAddressDomain(mode: EmailnatorGenerationMode): string | null {
  switch (mode) {
    case "dotGmail":
    case "plusGmail":
      return "gmail.com";
    case "googleMail":
      return "googlemail.com";
    case "domain":
      return null;
  }
}

function isCompatibleGeneratedAddress(address: string, mode: EmailnatorGenerationMode): boolean {
  if (!z.string().email().safeParse(address).success) {
    return false;
  }

  const expectedDomain = expectedGeneratedAddressDomain(mode);
  if (!expectedDomain) {
    return false;
  }

  return addressDomain(address) === expectedDomain;
}

async function requestGeneratedInboxAddress(
  state: EmailnatorProviderState,
  mode: EmailnatorGenerationMode,
  runtime?: EmailnatorRuntime,
): Promise<{ address: string | null; state: EmailnatorProviderState }> {
  const result = await performRequest(
    state,
    EMAILNATOR_GENERATE_PATH,
    {
      accept: "application/json, text/plain, */*",
      method: "POST",
      jsonBody: {
        email: [mode],
      },
    },
    runtime,
  );

  const parsed = parseWithSchema(
    emailnatorGenerateResponseSchema,
    parseJsonBody(result.body, "Generate response"),
    "Generate response",
  );
  const addresses = Array.isArray(parsed.email) ? parsed.email : [parsed.email];
  const address =
    addresses.find((candidate) => isCompatibleGeneratedAddress(candidate, mode)) ?? null;

  return {
    address,
    state: parseWithSchema(
      emailnatorProviderStateSchema,
      address
        ? {
            ...result.state,
            address,
          }
        : result.state,
      "Generated provider state",
    ),
  };
}

export async function generateInboxAddress(
  runtime?: EmailnatorRuntime,
): Promise<GeneratedInboxResult> {
  const bootstrapped = await bootstrapProviderSession(undefined, runtime);
  const primaryAttempt = await requestGeneratedInboxAddress(
    bootstrapped,
    EMAILNATOR_DEFAULT_GENERATION_MODE,
    runtime,
  );

  if (primaryAttempt.address) {
    return {
      address: primaryAttempt.address,
      state: primaryAttempt.state,
      diagnostics: await redactStateDiagnostics(primaryAttempt.state),
    };
  }

  const fallbackAttempt = await requestGeneratedInboxAddress(
    primaryAttempt.state,
    EMAILNATOR_FALLBACK_GENERATION_MODE,
    runtime,
  );

  if (fallbackAttempt.address) {
    return {
      address: fallbackAttempt.address,
      state: fallbackAttempt.state,
      diagnostics: await redactStateDiagnostics(fallbackAttempt.state),
    };
  }

  throw new EmailnatorError(
    "PROVIDER_RESPONSE_INVALID",
    "The provider did not return a Gmail-style inbox address compatible with the MVP.",
    { status: 502 },
  );
}

export async function listInboxMessages(
  state: EmailnatorProviderState,
  runtime?: EmailnatorRuntime,
): Promise<ListedInboxResult> {
  if (!state.address) {
    throw new EmailnatorError(
      "STATE_INVALID",
      "The provider state does not contain an inbox address.",
      {
        status: 400,
      },
    );
  }

  const result = await performRequest(
    state,
    EMAILNATOR_MESSAGE_LIST_PATH,
    {
      accept: "application/json, text/plain, */*",
      method: "POST",
      jsonBody: {
        email: state.address,
      },
    },
    runtime,
  );

  const parsed = parseWithSchema(
    emailnatorMessageListResponseSchema,
    parseJsonBody(result.body, "Message-list response"),
    "Message-list response",
  );
  const nextState = emailnatorProviderStateSchema.parse({
    ...result.state,
    lastListedMessageIds: (parsed.messageData ?? []).map((message) => message.messageID),
  });

  return {
    messages: parsed.messageData ?? [],
    state: nextState,
    diagnostics: await redactStateDiagnostics(nextState),
  };
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"');
}

function sanitizeHtmlToText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function buildSanitizedDetail(body: string, contentType: string): SanitizedDetailResult {
  const text = contentType.includes("html") ? sanitizeHtmlToText(body) : body.trim();
  const normalizedText = text.replace(/\s+/g, " ").trim();

  return {
    contentType,
    bodyLength: body.length,
    text,
    textPreview: normalizedText.slice(0, 200),
    markerFound: KNOWN_TEST_MARKERS.some((marker) => normalizedText.includes(marker)),
  };
}

export async function getMessageDetail(
  state: EmailnatorProviderState,
  messageId: string,
  runtime?: EmailnatorRuntime,
): Promise<MessageDetailResult> {
  if (!state.address) {
    throw new EmailnatorError(
      "STATE_INVALID",
      "The provider state does not contain an inbox address.",
      {
        status: 400,
      },
    );
  }

  const result = await performRequest(
    state,
    EMAILNATOR_MESSAGE_LIST_PATH,
    {
      accept: "text/html, application/json, text/plain, */*",
      method: "POST",
      jsonBody: {
        email: state.address,
        messageID: messageId,
      },
    },
    runtime,
  );

  const detail = buildSanitizedDetail(result.body, result.contentType);
  const nextState = emailnatorProviderStateSchema.parse(result.state);

  return {
    detail,
    state: nextState,
    diagnostics: await redactStateDiagnostics(nextState),
  };
}

export function summarizeMessagesForProbe(messages: EmailnatorMessageSummary[]) {
  return messages.map((message) => ({
    messageId: message.messageID,
    fromPreview: message.from.slice(0, 80),
    subjectPreview: message.subject.slice(0, 120),
    time: message.time,
  }));
}

export const __testables = {
  createProviderUrl,
  isChallengeBody,
  parseJsonBody,
  parseWithSchema,
  performRequest,
  readResponseText,
};
