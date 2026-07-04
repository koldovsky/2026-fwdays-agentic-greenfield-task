import { parseSlotEndMinutes } from "@/lib/booking/availability";

import type { ConfirmedBooking } from "./types";

/** Local end time of the booked slot on `date` (YYYY-MM-DD). */
export function expiresAtForSlot(date: string, slot: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const expires = new Date(y, m - 1, d);
  const endMinutes = parseSlotEndMinutes(slot);

  if (endMinutes !== null) {
    expires.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
  } else {
    expires.setHours(23, 59, 59, 999);
  }

  return expires;
}

export function isBookingExpired(
  booking: Pick<ConfirmedBooking, "expiresAt">,
  now: Date = new Date(),
): boolean {
  return now.getTime() > new Date(booking.expiresAt).getTime();
}
