/**
 * Domain error union that every raw Samsung JSON-RPC `-32xxx` code and
 * every transport-level socket failure MUST be mapped into before it
 * leaves the back-end. Raw codes NEVER appear in HTTP response bodies —
 * `AGENTS.md` house rule.
 */
export type TvErrorCode =
  | 'TvNotReachable'
  | 'TvNotSupported'
  | 'TvFailed'
  | 'TvInvalidOp'
  | 'TvUnknown';

const HTTP_STATUS: Record<TvErrorCode, number> = {
  TvNotReachable: 502,
  TvNotSupported: 501,
  TvFailed: 500,
  TvInvalidOp: 400,
  TvUnknown: 500,
};

export class TvError extends Error {
  constructor(
    readonly code: TvErrorCode,
    message: string,
    /** The raw `-32xxx` code from the TV, if any. NEVER surfaced in HTTP responses. */
    readonly rawCode?: number,
    /** JSON-RPC id of the correlated request, for log correlation. */
    readonly rpcId?: number,
  ) {
    super(message);
    this.name = 'TvError';
  }

  get httpStatus(): number {
    return HTTP_STATUS[this.code];
  }
}

/**
 * Map a raw JSON-RPC error code from a Samsung TV into the domain union.
 * Table from `openspec/changes/tv-connection-lifecycle/design.md` D5,
 * cross-checked against `docs/samsung-ip-control-protocol/` §1.6.
 */
export function mapRpcErrorCode(rawCode: number): TvErrorCode {
  if (rawCode === -32601 || rawCode === -32001) return 'TvNotSupported';
  if (rawCode === -32602 || rawCode === -32003) return 'TvInvalidOp';
  if (rawCode === -32000 || rawCode === -32002) return 'TvFailed';
  // -32000..-32099 generic server range: bucket to TvFailed.
  if (rawCode <= -32000 && rawCode >= -32099) return 'TvFailed';
  return 'TvUnknown';
}

/**
 * Map a transport-level failure (socket refused, timeout, TLS handshake)
 * into `TvNotReachable`. Callers pass the underlying `Error` for logging
 * — its message and code are used to build a diagnostic string.
 */
export function mapTransportError(err: unknown, rpcId?: number): TvError {
  const message =
    err && typeof err === 'object' && 'message' in err
      ? String((err as { message: unknown }).message)
      : 'unknown transport error';
  return new TvError('TvNotReachable', message, undefined, rpcId);
}

export interface TvErrorEnvelope {
  code: TvErrorCode;
  message: string;
  correlationId: string;
}

export function toHttpEnvelope(
  err: TvError,
  correlationId: string,
): { status: number; body: TvErrorEnvelope } {
  return {
    status: err.httpStatus,
    body: {
      code: err.code,
      message: err.message,
      correlationId,
    },
  };
}
