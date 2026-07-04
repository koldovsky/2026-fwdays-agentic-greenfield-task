import type { NextRequest } from "next/server";

/** Shared secret for scheduled job runner (system cron → POST /api/booking/schedule/run). */
export function isValidCronRequest(request: NextRequest): boolean {
  const secret = process.env.COLIBRI_CRON_SECRET?.trim();
  if (!secret) return false;

  const header = request.headers.get("x-cron-secret");
  if (header === secret) return true;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  return false;
}
