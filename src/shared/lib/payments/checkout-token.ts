// Signed checkout-session token. createCheckout embeds the plan, user, and
// returnTo (FR-PAYWALL-03) in the /checkout URL; signing prevents the browser
// from upgrading the plan or redirect target in transit. Same HMAC seam as the
// webhook signature. Framework-free, secret injected by the caller.
import { signPayload, verifySignature } from "./signature";
import { isPaymentsPlan, type PaymentsPlan } from "./types";

export interface CheckoutTokenPayload {
  readonly userId: string;
  readonly plan: PaymentsPlan;
  /** Site-relative path to return to after checkout (FR-PAYWALL-03). */
  readonly returnTo: string;
  /** ISO-8601 issue time. */
  readonly issuedAt: string;
}

/**
 * Only same-origin paths may be a checkout return target — rejects absolute
 * URLs and protocol-relative `//host` forms (open-redirect guard).
 */
export function isSafeReturnTo(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\");
}

/** Token format: base64url(JSON payload) + "." + HMAC of that base64url body. */
export function createCheckoutToken(payload: CheckoutTokenPayload, secret: string): string {
  if (!isSafeReturnTo(payload.returnTo)) {
    throw new Error("checkout returnTo must be a site-relative path");
  }
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${signPayload(body, secret)}`;
}

/**
 * Verify and decode a token. Returns null — never throws — on a missing or
 * tampered signature, malformed body, or unsafe returnTo (NFR-OBS-01).
 */
export function verifyCheckoutToken(token: string, secret: string): CheckoutTokenPayload | null {
  const sep = token.lastIndexOf(".");
  if (sep <= 0) return null;
  const body = token.slice(0, sep);
  if (!verifySignature(body, token.slice(sep + 1), secret)) return null;

  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (value === null || typeof value !== "object") return null;
  const { userId, plan, returnTo, issuedAt } = value as Record<string, unknown>;
  if (typeof userId !== "string" || userId === "") return null;
  if (!isPaymentsPlan(plan)) return null;
  if (typeof returnTo !== "string" || !isSafeReturnTo(returnTo)) return null;
  if (typeof issuedAt !== "string" || Number.isNaN(Date.parse(issuedAt))) return null;
  return { userId, plan, returnTo, issuedAt };
}
