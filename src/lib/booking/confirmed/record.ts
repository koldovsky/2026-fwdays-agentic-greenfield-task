import type { SubmitSuccess } from "@/lib/booking/submit";

import { expiresAtForSlot } from "./expiry";
import type { ConfirmedBooking, ConfirmedBookingSource } from "./types";

export function confirmedBookingFromSuccess(
  success: SubmitSuccess,
  meta: { residentId?: string | null; source: ConfirmedBookingSource },
): ConfirmedBooking {
  return {
    id: crypto.randomUUID(),
    residentId: meta.residentId ?? null,
    fullName: success.fullName,
    email: success.email,
    facility: success.facility,
    date: success.date,
    court: success.court,
    slot: success.slot,
    confirmedAt: success.confirmedAt,
    expiresAt: expiresAtForSlot(success.date, success.slot).toISOString(),
    runId: success.runId,
    source: meta.source,
    mhoaApproved: success.mhoaApproved,
  };
}
