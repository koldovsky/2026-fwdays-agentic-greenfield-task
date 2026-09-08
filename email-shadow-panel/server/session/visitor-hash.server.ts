import { createHmac } from "node:crypto";

import { anonymousVisitorHashSchema, visitorIdentifierSchema } from "./contracts.server.ts";
import { DomainError } from "./errors.server.ts";

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, "base64url");
}

function decodeKeyMaterial(secret: string, envName: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/u.test(secret)) {
    return Buffer.from(secret, "hex");
  }

  try {
    const decoded = fromBase64Url(secret);
    if (decoded.length === 32) {
      return decoded;
    }
  } catch {
    // Fall through to the configuration error below.
  }

  throw new DomainError("CONFIGURATION_INVALID", `${envName} must decode to exactly 32 bytes.`, {
    safeMessage: "Required secure server configuration is invalid.",
  });
}

export interface VisitorHashService {
  hashVisitorIdentifier(visitorIdentifier: string): string;
  hashClientIpAddress(ipAddress: string): string;
}

export function createVisitorHashService(options: {
  key: string;
  keyEnvName?: string;
}): VisitorHashService {
  const keyMaterial = decodeKeyMaterial(options.key, options.keyEnvName ?? "VISITOR_HASH_KEY");

  return {
    hashVisitorIdentifier(visitorIdentifier: string): string {
      const parsed = visitorIdentifierSchema.safeParse(visitorIdentifier);
      if (!parsed.success) {
        throw new DomainError("CONFIGURATION_INVALID", "Visitor identifier validation failed.", {
          safeMessage: "The supplied visitor identifier is invalid.",
        });
      }

      return anonymousVisitorHashSchema.parse(
        createHmac("sha256", keyMaterial)
          .update("visitor:", "utf8")
          .update(parsed.data, "utf8")
          .digest("base64url"),
      );
    },
    hashClientIpAddress(ipAddress: string): string {
      const parsed = visitorIdentifierSchema.safeParse(ipAddress);
      if (!parsed.success) {
        throw new DomainError("CONFIGURATION_INVALID", "Client IP validation failed.", {
          safeMessage: "The supplied client address is invalid.",
        });
      }

      return anonymousVisitorHashSchema.parse(
        createHmac("sha256", keyMaterial)
          .update("client-ip:", "utf8")
          .update(parsed.data, "utf8")
          .digest("base64url"),
      );
    },
  };
}
