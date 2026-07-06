export type DomainErrorCode =
  | "CONFIGURATION_INVALID"
  | "ENCRYPTION_FAILURE"
  | "INVALID_CAPABILITY"
  | "INVALID_MESSAGE_REFERENCE"
  | "PERSISTENCE_UNAVAILABLE"
  | "PROVIDER_CHALLENGE"
  | "PROVIDER_RESPONSE_INCOMPATIBLE"
  | "PROVIDER_UNAVAILABLE"
  | "SESSION_EXPIRED"
  | "SESSION_NOT_FOUND"
  | "STALE_SESSION_VERSION"
  | "TIMEOUT";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly safeMessage: string;
  readonly details?: Record<string, unknown>;

  constructor(
    code: DomainErrorCode,
    message: string,
    options?: {
      cause?: unknown;
      details?: Record<string, unknown>;
      safeMessage?: string;
    },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "DomainError";
    this.code = code;
    this.safeMessage = options?.safeMessage ?? message;
    this.details = options?.details;
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

export function ensureDomainError(
  error: unknown,
  fallback: {
    code: DomainErrorCode;
    message: string;
    safeMessage: string;
  },
): DomainError {
  if (error instanceof DomainError) {
    return error;
  }

  return new DomainError(fallback.code, fallback.message, {
    cause: error,
    safeMessage: fallback.safeMessage,
  });
}
