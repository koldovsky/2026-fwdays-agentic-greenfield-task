import { isIP } from "node:net";

import type { VisitorHashService } from "../session/visitor-hash.server.ts";
import { DomainError } from "../session/errors.server.ts";

export interface TrustedClientIpHash {
  clientIpHash: string;
  source: "x-forwarded-for" | "x-real-ip" | "local-dev";
}

function normalizeIpToken(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 256) {
    return null;
  }

  if (trimmed.startsWith("[")) {
    const closingBracket = trimmed.indexOf("]");
    if (closingBracket <= 1) {
      return null;
    }

    return trimmed.slice(1, closingBracket);
  }

  if (trimmed.includes(":")) {
    const ipv4WithPort = /^(?<ip>\d+\.\d+\.\d+\.\d+):\d+$/u.exec(trimmed);
    if (ipv4WithPort?.groups?.ip) {
      return ipv4WithPort.groups.ip;
    }
  }

  return trimmed;
}

function parseTrustedForwardedFor(value: string): string {
  if (value.length > 256) {
    throw new DomainError("INVALID_REQUEST", "The forwarded client address was oversized.", {
      safeMessage: "The request client address is invalid.",
    });
  }

  const [firstToken] = value.split(",", 2);
  const normalized = normalizeIpToken(firstToken ?? "");
  if (!normalized || isIP(normalized) === 0) {
    throw new DomainError("INVALID_REQUEST", "The forwarded client address was malformed.", {
      safeMessage: "The request client address is invalid.",
    });
  }

  return normalized;
}

function parseSingleIpHeader(value: string, headerName: string): string {
  const normalized = normalizeIpToken(value);
  if (!normalized || isIP(normalized) === 0) {
    throw new DomainError("INVALID_REQUEST", `${headerName} was malformed.`, {
      safeMessage: "The request client address is invalid.",
    });
  }

  return normalized;
}

function isLocalDevelopmentRequest(request: Request): boolean {
  const hostname = new URL(request.url).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function extractTrustedClientIpHash(
  request: Request,
  visitorHashService: VisitorHashService,
): TrustedClientIpHash {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return {
      clientIpHash: visitorHashService.hashClientIpAddress(parseTrustedForwardedFor(forwarded)),
      source: "x-forwarded-for",
    };
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return {
      clientIpHash: visitorHashService.hashClientIpAddress(
        parseSingleIpHeader(realIp, "x-real-ip"),
      ),
      source: "x-real-ip",
    };
  }

  if (isLocalDevelopmentRequest(request)) {
    return {
      clientIpHash: visitorHashService.hashClientIpAddress("127.0.0.1"),
      source: "local-dev",
    };
  }

  throw new DomainError("INVALID_REQUEST", "Missing trusted client address header.", {
    safeMessage: "The request client address is invalid.",
  });
}
