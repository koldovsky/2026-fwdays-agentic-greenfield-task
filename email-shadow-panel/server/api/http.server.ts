import {
  validateCapabilityToken,
  validateAndHashCapabilityToken,
} from "../session/capability-token.server.ts";
import { DomainError, ensureDomainError } from "../session/errors.server.ts";
import { publicErrorEnvelopeSchema, type PublicErrorEnvelope } from "./contracts.server.ts";

const COMMON_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

function jsonResponse(body: unknown, status: number, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...COMMON_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      ...(headers ?? {}),
    },
  });
}

export function createJsonResponse(body: unknown, status = 200, headers?: HeadersInit): Response {
  return jsonResponse(body, status, headers);
}

export function createNoContentResponse(headers?: HeadersInit): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...COMMON_HEADERS,
      ...(headers ?? {}),
    },
  });
}

export function createMethodNotAllowedResponse(requestId: string, allow: string[]): Response {
  return createPublicErrorResponse(
    {
      code: "METHOD_NOT_ALLOWED",
      message: "The HTTP method is not allowed.",
      requestId,
      retryable: false,
    },
    405,
    { Allow: allow.join(", ") },
  );
}

export function createPublicErrorResponse(
  error: PublicErrorEnvelope["error"],
  status: number,
  headers?: HeadersInit,
): Response {
  return jsonResponse(publicErrorEnvelopeSchema.parse({ error }), status, headers);
}

export function assertNoUnexpectedQuery(request: Request): void {
  const url = new URL(request.url);
  if (url.searchParams.size > 0) {
    throw new DomainError("INVALID_REQUEST", "Unexpected query parameters were supplied.", {
      safeMessage: "The request is invalid.",
    });
  }
}

export async function assertNoRequestBody(request: Request): Promise<void> {
  const body = await request.text();
  if (body.length > 0) {
    throw new DomainError("INVALID_REQUEST", "Unexpected request body content was supplied.", {
      safeMessage: "The request is invalid.",
    });
  }
}

export function assertSameOrigin(request: Request): void {
  const originHeader = request.headers.get("origin");
  if (!originHeader) {
    return;
  }

  let origin: URL;
  try {
    origin = new URL(originHeader);
  } catch (error) {
    throw new DomainError("ORIGIN_NOT_ALLOWED", "The request Origin header was invalid.", {
      cause: error,
      safeMessage: "The request origin is not allowed.",
    });
  }

  const requestUrl = new URL(request.url);
  const allowedOrigins = new Set<string>([requestUrl.origin]);
  const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const forwardedProto =
    request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(/:$/u, "");
  if (forwardedHost && !forwardedHost.includes(",")) {
    allowedOrigins.add(`${forwardedProto}://${forwardedHost}`);
  }

  if (!allowedOrigins.has(origin.origin)) {
    throw new DomainError("ORIGIN_NOT_ALLOWED", "The request Origin header was not same-origin.", {
      safeMessage: "The request origin is not allowed.",
    });
  }
}

export function extractBearerCapability(request: Request): {
  capabilityToken: string;
  capabilityTokenHash: string;
} {
  const authorization = request.headers.get("authorization");
  if (!authorization || authorization.length > 512 || authorization.includes(",")) {
    throw new DomainError("INVALID_CAPABILITY", "A valid bearer capability header is required.", {
      safeMessage: "A valid capability token is required.",
    });
  }

  const match = /^Bearer\s+([^\s]+)$/u.exec(authorization.trim());
  if (!match) {
    throw new DomainError("INVALID_CAPABILITY", "The bearer capability header was malformed.", {
      safeMessage: "A valid capability token is required.",
    });
  }

  const capabilityToken = validateCapabilityToken(match[1]);
  return {
    capabilityToken,
    capabilityTokenHash: validateAndHashCapabilityToken(capabilityToken),
  };
}

export function createRequestDeadlineSignal(
  requestSignal: AbortSignal,
  timeoutMs: number,
): {
  signal: AbortSignal;
  dispose(): void;
} {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new DOMException("Timed out", "AbortError")),
    timeoutMs,
  );
  const onAbort = () => controller.abort(requestSignal.reason);

  if (requestSignal.aborted) {
    controller.abort(requestSignal.reason);
  } else {
    requestSignal.addEventListener("abort", onAbort, { once: true });
  }

  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timeout);
      requestSignal.removeEventListener("abort", onAbort);
    },
  };
}

export function normalizePublicApiError(
  error: unknown,
  requestId: string,
): { envelope: PublicErrorEnvelope["error"]; status: number; headers?: HeadersInit } {
  const normalized = ensureDomainError(error, {
    code: "CONFIGURATION_INVALID",
    message: "Unexpected server failure.",
    safeMessage: "An unexpected server error occurred.",
  });

  const retryAfterSeconds = Number(normalized.details?.retryAfterSeconds);
  const retryAfterHeader =
    Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
      ? { "Retry-After": String(retryAfterSeconds) }
      : undefined;

  switch (normalized.code) {
    case "INVALID_REQUEST":
      return {
        status: 400,
        envelope: {
          code: "INVALID_REQUEST",
          message: "The request is invalid.",
          requestId,
          retryable: false,
        },
      };
    case "INVALID_CAPABILITY":
      return {
        status: 401,
        envelope: {
          code: "INVALID_CAPABILITY",
          message: "A valid capability token is required.",
          requestId,
          retryable: false,
        },
      };
    case "SESSION_NOT_FOUND":
      return {
        status: 404,
        envelope: {
          code: "SESSION_NOT_FOUND",
          message: "The inbox session was not found.",
          requestId,
          retryable: false,
        },
      };
    case "SESSION_EXPIRED":
      return {
        status: 410,
        envelope: {
          code: "SESSION_EXPIRED",
          message: "The inbox session has expired.",
          requestId,
          retryable: false,
        },
      };
    case "INVALID_MESSAGE_REFERENCE":
      return {
        status: 404,
        envelope: {
          code: "MESSAGE_NOT_FOUND",
          message: "The message was not found.",
          requestId,
          retryable: false,
        },
      };
    case "RATE_LIMITED":
      return {
        status: 429,
        envelope: {
          code: "RATE_LIMITED",
          message: "Too many requests were sent.",
          requestId,
          retryable: true,
        },
        headers: retryAfterHeader,
      };
    case "ACTIVE_INBOX_LIMIT_REACHED":
      return {
        status: 429,
        envelope: {
          code: "ACTIVE_INBOX_LIMIT",
          message: "The active inbox limit has been reached.",
          requestId,
          retryable: true,
        },
      };
    case "OPERATION_IN_PROGRESS":
    case "STALE_SESSION_VERSION":
      return {
        status: 409,
        envelope: {
          code: "OPERATION_IN_PROGRESS",
          message: "Another inbox operation is already in progress.",
          requestId,
          retryable: true,
        },
        headers: retryAfterHeader,
      };
    case "PROVIDER_DISABLED":
    case "PROVIDER_CHALLENGE":
    case "PROVIDER_RESPONSE_INCOMPATIBLE":
    case "PROVIDER_UNAVAILABLE":
      return {
        status: 503,
        envelope: {
          code: "PROVIDER_UNAVAILABLE",
          message: "The inbox provider is temporarily unavailable.",
          requestId,
          retryable: true,
        },
      };
    case "PERSISTENCE_UNAVAILABLE":
      return {
        status: 503,
        envelope: {
          code: "SERVICE_UNAVAILABLE",
          message: "The service is temporarily unavailable.",
          requestId,
          retryable: true,
        },
      };
    case "TIMEOUT":
      return {
        status: 504,
        envelope: {
          code: "REQUEST_TIMEOUT",
          message: "The request timed out.",
          requestId,
          retryable: true,
        },
      };
    case "ORIGIN_NOT_ALLOWED":
      return {
        status: 403,
        envelope: {
          code: "FORBIDDEN_ORIGIN",
          message: "The request origin is not allowed.",
          requestId,
          retryable: false,
        },
      };
    case "METHOD_NOT_ALLOWED":
      return {
        status: 405,
        envelope: {
          code: "METHOD_NOT_ALLOWED",
          message: "The HTTP method is not allowed.",
          requestId,
          retryable: false,
        },
      };
    case "CONFIGURATION_INVALID":
    case "ENCRYPTION_FAILURE":
    default:
      return {
        status: 500,
        envelope: {
          code: "INTERNAL_ERROR",
          message: "An unexpected server error occurred.",
          requestId,
          retryable: false,
        },
      };
  }
}
