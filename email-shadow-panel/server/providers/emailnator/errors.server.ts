export type EmailnatorErrorCode =
  | "AUTH_INVALID"
  | "AUTH_MISSING"
  | "CAPSULE_EXPIRED"
  | "CAPSULE_INVALID"
  | "CONFIG_INVALID"
  | "METHOD_NOT_ALLOWED"
  | "PROBE_DISABLED"
  | "PREVIEW_ONLY"
  | "PROVIDER_BLOCKED"
  | "PROVIDER_HTTP"
  | "PROVIDER_RESPONSE_INVALID"
  | "REQUEST_TIMEOUT"
  | "REQUEST_TOO_LARGE"
  | "STATE_INVALID"
  | "UNSUPPORTED_ACTION"
  | "UNSUPPORTED_RUNTIME"
  | "VALIDATION_FAILED";

export class EmailnatorError extends Error {
  readonly code: EmailnatorErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: EmailnatorErrorCode,
    message: string,
    options?: {
      cause?: unknown;
      details?: Record<string, unknown>;
      status?: number;
    },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "EmailnatorError";
    this.code = code;
    this.status = options?.status ?? 500;
    this.details = options?.details;
  }
}

export function isEmailnatorError(error: unknown): error is EmailnatorError {
  return error instanceof EmailnatorError;
}

export function ensureEmailnatorError(error: unknown): EmailnatorError {
  if (error instanceof EmailnatorError) {
    return error;
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return new EmailnatorError("REQUEST_TIMEOUT", "The provider request timed out.", {
      cause: error,
      status: 504,
    });
  }

  return new EmailnatorError("PROVIDER_HTTP", "An unexpected provider error occurred.", {
    cause: error,
    status: 502,
  });
}

export function toErrorResponse(error: unknown): Response {
  const normalized = ensureEmailnatorError(error);

  return Response.json(
    {
      ok: false,
      error: {
        code: normalized.code,
        message: normalized.message,
      },
    },
    { status: normalized.status },
  );
}
