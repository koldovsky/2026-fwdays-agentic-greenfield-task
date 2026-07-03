// Wire format for payments webhook events. Serialization is centralized so the
// byte-for-byte payload that gets signed is exactly the payload that verifies
// (signature covers the raw body, see ./signature.ts). Framework-free.
import { isPaymentsPlan, type PaymentsEvent, type PaymentsEventType } from "./types";

const EVENT_TYPES: readonly string[] = [
  "checkout.completed",
  "checkout.failed",
  "subscription.canceled",
];

function isEventType(value: unknown): value is PaymentsEventType {
  return typeof value === "string" && EVENT_TYPES.includes(value);
}

/** Serialize an event for signing + delivery. */
export function serializePaymentsEvent(event: PaymentsEvent): string {
  return JSON.stringify(event);
}

/**
 * Parse and validate an untrusted webhook body. Returns null — never throws —
 * on malformed JSON or a bad shape (NFR-OBS-01); the route maps null to 400.
 */
export function parsePaymentsEvent(raw: string): PaymentsEvent | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (value === null || typeof value !== "object") return null;
  const { id, type, userId, plan, occurredAt } = value as Record<string, unknown>;
  if (typeof id !== "string" || id === "") return null;
  if (!isEventType(type)) return null;
  if (typeof userId !== "string" || userId === "") return null;
  if (!isPaymentsPlan(plan)) return null;
  if (typeof occurredAt !== "string" || Number.isNaN(Date.parse(occurredAt))) return null;
  return { id, type, userId, plan, occurredAt };
}
