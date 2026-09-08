import { randomBytes } from "node:crypto";

import { publicRequestIdSchema } from "./contracts.server.ts";

type RandomBytesFn = (size: number) => Uint8Array;

export interface PublicApiLogEvent {
  requestId: string;
  route: string;
  method: string;
  status: number;
  durationMs: number;
  errorCode?: string;
}

export interface PublicApiLogger {
  log(event: PublicApiLogEvent): void | Promise<void>;
}

export const noopPublicApiLogger: PublicApiLogger = {
  log() {
    // Intentionally empty by default to avoid accidental sensitive logging.
  },
};

export function createRequestId(randomBytesImpl: RandomBytesFn = randomBytes): string {
  return publicRequestIdSchema.parse(
    `req_${Buffer.from(randomBytesImpl(9)).toString("base64url")}`,
  );
}
