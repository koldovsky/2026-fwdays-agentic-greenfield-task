import { z } from "zod";
import type {
  InboxApiErrorKind,
  InboxMessageDetail,
  InboxMetadata,
  InboxMessageSummary,
} from "../types/inbox.ts";

const base64UrlSchema = z
  .string()
  .min(20)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/u);

const messageReferenceSchema = z
  .string()
  .min(12)
  .max(128)
  .regex(/^msg_[A-Za-z0-9_-]+$/u);

const inboxMetadataSchema = z.object({
  address: z.string().email(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

const publicErrorCodeSchema = z.enum([
  "ACTIVE_INBOX_LIMIT",
  "FORBIDDEN_ORIGIN",
  "INVALID_CAPABILITY",
  "INVALID_REQUEST",
  "INTERNAL_ERROR",
  "MESSAGE_NOT_FOUND",
  "METHOD_NOT_ALLOWED",
  "OPERATION_IN_PROGRESS",
  "PROVIDER_UNAVAILABLE",
  "RATE_LIMITED",
  "REQUEST_TIMEOUT",
  "SERVICE_UNAVAILABLE",
  "SESSION_EXPIRED",
  "SESSION_NOT_FOUND",
]);

const publicErrorEnvelopeSchema = z.object({
  error: z.object({
    code: publicErrorCodeSchema,
    message: z.string().min(1).max(200),
    requestId: z.string().min(1).max(32),
    retryable: z.boolean(),
  }),
});

const createInboxResponseSchema = z.object({
  data: z.object({
    capabilityToken: base64UrlSchema,
    inbox: inboxMetadataSchema,
  }),
});

const listMessagesResponseSchema = z.object({
  data: z.object({
    inbox: inboxMetadataSchema,
    messages: z.array(
      z.object({
        reference: messageReferenceSchema,
        from: z.string().min(1),
        subject: z.string().min(1),
        time: z.string().min(1),
      }),
    ),
  }),
});

const messageDetailResponseSchema = z.object({
  data: z.object({
    inbox: inboxMetadataSchema,
    message: z.object({
      reference: messageReferenceSchema,
      contentType: z.string().min(1),
      bodyLength: z.number().int().nonnegative(),
      text: z.string(),
      textPreview: z.string(),
      markerFound: z.boolean(),
    }),
  }),
});

const healthResponseSchema = z.object({
  data: z.object({
    status: z.enum(["ok", "degraded"]),
  }),
});

export interface CreateInboxResult {
  capabilityToken: string;
  inbox: InboxMetadata;
}

export interface ListMessagesResult {
  inbox: InboxMetadata;
  messages: Array<Omit<InboxMessageSummary, "preview">>;
}

export interface MessageDetailResult {
  inbox: InboxMetadata;
  message: InboxMessageDetail;
}

export interface InboxApiClient {
  createInbox(options?: { signal?: AbortSignal }): Promise<CreateInboxResult>;
  listMessages(
    capabilityToken: string,
    options?: { signal?: AbortSignal },
  ): Promise<ListMessagesResult>;
  getMessageDetail(
    capabilityToken: string,
    messageReference: string,
    options?: { signal?: AbortSignal },
  ): Promise<MessageDetailResult>;
  deleteInbox(capabilityToken: string, options?: { signal?: AbortSignal }): Promise<void>;
  getHealthStatus(options?: { signal?: AbortSignal }): Promise<"ok" | "degraded">;
}

export class InboxApiClientError extends Error {
  readonly kind: InboxApiErrorKind;
  readonly retryAfterSeconds: number | null;
  readonly retryable: boolean;
  readonly stableCode: string | null;
  readonly requestId: string | null;
  readonly status: number | null;

  constructor(
    kind: InboxApiErrorKind,
    message: string,
    options?: {
      retryAfterSeconds?: number | null;
      retryable?: boolean;
      stableCode?: string | null;
      requestId?: string | null;
      status?: number | null;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = "InboxApiClientError";
    this.kind = kind;
    this.retryAfterSeconds = options?.retryAfterSeconds ?? null;
    this.retryable = options?.retryable ?? false;
    this.stableCode = options?.stableCode ?? null;
    this.requestId = options?.requestId ?? null;
    this.status = options?.status ?? null;
  }
}

function parseRetryAfterHeader(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return Math.min(parsed, 300);
}

function mapPublicError(
  status: number,
  error: z.infer<typeof publicErrorEnvelopeSchema>["error"],
  retryAfterSeconds: number | null,
): InboxApiClientError {
  const common = {
    retryAfterSeconds,
    retryable: error.retryable,
    stableCode: error.code,
    requestId: error.requestId,
    status,
  };

  switch (error.code) {
    case "ACTIVE_INBOX_LIMIT":
      return new InboxApiClientError(
        "activeInboxLimit",
        "The recent inbox limit for this browser has been reached.",
        common,
      );
    case "INVALID_CAPABILITY":
      return new InboxApiClientError(
        "invalidSession",
        "This inbox session is no longer valid.",
        common,
      );
    case "INVALID_REQUEST":
    case "FORBIDDEN_ORIGIN":
    case "METHOD_NOT_ALLOWED":
      return new InboxApiClientError(
        "invalidRequest",
        "The request could not be completed.",
        common,
      );
    case "MESSAGE_NOT_FOUND":
      return new InboxApiClientError(
        "messageNotFound",
        "The selected message is no longer available.",
        common,
      );
    case "OPERATION_IN_PROGRESS":
      return new InboxApiClientError(
        "refreshInProgress",
        "Another inbox refresh is already running.",
        common,
      );
    case "PROVIDER_UNAVAILABLE":
      return new InboxApiClientError(
        "providerUnavailable",
        "The inbox provider is temporarily unavailable.",
        common,
      );
    case "RATE_LIMITED":
      return new InboxApiClientError("rateLimited", "Too many requests were sent.", common);
    case "REQUEST_TIMEOUT":
      return new InboxApiClientError("timeout", "The request timed out.", common);
    case "SERVICE_UNAVAILABLE":
      return new InboxApiClientError(
        "providerUnavailable",
        "The inbox service is temporarily unavailable.",
        common,
      );
    case "SESSION_EXPIRED":
      return new InboxApiClientError("sessionExpired", "This inbox session has expired.", common);
    case "SESSION_NOT_FOUND":
      return new InboxApiClientError("sessionMissing", "This inbox session was not found.", common);
    case "INTERNAL_ERROR":
    default:
      return new InboxApiClientError("internal", "An unexpected server error occurred.", common);
  }
}

function mapNetworkError(error: unknown): InboxApiClientError {
  return new InboxApiClientError("offline", "The network request could not be completed.", {
    cause: error,
  });
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function createBrowserInboxApiClient(options?: {
  fetchImpl?: typeof fetch;
}): InboxApiClient {
  const fetchImpl = options?.fetchImpl ?? fetch;

  async function performRequest<TValue>(input: {
    path: string;
    method: "GET" | "POST" | "DELETE";
    schema: z.ZodType<TValue>;
    capabilityToken?: string;
    signal?: AbortSignal;
  }): Promise<TValue> {
    const headers = new Headers();
    if (input.capabilityToken) {
      headers.set("authorization", `Bearer ${input.capabilityToken}`);
    }

    let response: Response;
    try {
      response = await fetchImpl(input.path, {
        method: input.method,
        credentials: "same-origin",
        headers,
        signal: input.signal,
      });
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      throw mapNetworkError(error);
    }

    const retryAfterSeconds = parseRetryAfterHeader(response.headers.get("retry-after"));
    const text = await response.text();

    let parsedJson: unknown;
    try {
      parsedJson = text.length === 0 ? null : JSON.parse(text);
    } catch (error) {
      throw new InboxApiClientError("malformedResponse", "The server response was malformed.", {
        status: response.status,
        cause: error,
      });
    }

    if (!response.ok) {
      const parsedError = publicErrorEnvelopeSchema.safeParse(parsedJson);
      if (!parsedError.success) {
        throw new InboxApiClientError(
          "malformedResponse",
          "The server error response was malformed.",
          {
            status: response.status,
          },
        );
      }

      throw mapPublicError(response.status, parsedError.data.error, retryAfterSeconds);
    }

    const parsed = input.schema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new InboxApiClientError("malformedResponse", "The server response was malformed.", {
        status: response.status,
      });
    }

    return parsed.data;
  }

  return {
    async createInbox(options) {
      const parsed = await performRequest({
        path: "/api/inboxes",
        method: "POST",
        schema: createInboxResponseSchema,
        signal: options?.signal,
      });

      return parsed.data;
    },
    async listMessages(capabilityToken, options) {
      const parsed = await performRequest({
        path: "/api/inboxes/messages",
        method: "GET",
        schema: listMessagesResponseSchema,
        capabilityToken,
        signal: options?.signal,
      });

      return parsed.data;
    },
    async getMessageDetail(capabilityToken, messageReference, options) {
      const parsed = await performRequest({
        path: `/api/inboxes/messages/${encodeURIComponent(messageReference)}`,
        method: "GET",
        schema: messageDetailResponseSchema,
        capabilityToken,
        signal: options?.signal,
      });

      return parsed.data;
    },
    async deleteInbox(capabilityToken, options) {
      await performRequest({
        path: "/api/inboxes",
        method: "DELETE",
        schema: z.null(),
        capabilityToken,
        signal: options?.signal,
      });
    },
    async getHealthStatus(options) {
      const parsed = await performRequest({
        path: "/api/health",
        method: "GET",
        schema: healthResponseSchema,
        signal: options?.signal,
      });

      return parsed.data.status;
    },
  };
}
