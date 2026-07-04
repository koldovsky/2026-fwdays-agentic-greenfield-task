import {
  formatAggregatedSlotLabel,
  parseSlotStartMinutes,
  slotsAreConsecutive,
} from "@/lib/booking/availability";

import type { ConfirmedBooking } from "./types";

export type ConfirmedBookingGroup = {
  id: string;
  date: string;
  court: string;
  facility: string;
  slotLabel: string;
  bookings: ConfirmedBooking[];
  confirmedAt: string;
  expiresAt: string;
  mhoaApproved: boolean;
};

function sortKey(booking: ConfirmedBooking): [string, string, number] {
  const start = parseSlotStartMinutes(booking.slot) ?? 0;
  return [booking.date, booking.court, start];
}

/** Merge consecutive court slots on the same day into one display row. */
export function groupConsecutiveConfirmedBookings(
  bookings: ConfirmedBooking[],
): ConfirmedBookingGroup[] {
  const sorted = [...bookings].sort((a, b) => {
    const [ad, ac, as] = sortKey(a);
    const [bd, bc, bs] = sortKey(b);
    if (ad !== bd) return ad.localeCompare(bd);
    if (ac !== bc) return ac.localeCompare(bc);
    return as - bs;
  });

  const groups: ConfirmedBookingGroup[] = [];

  for (const booking of sorted) {
    const last = groups[groups.length - 1];
    const canExtend =
      last &&
      last.date === booking.date &&
      last.court === booking.court &&
      slotsAreConsecutive(last.bookings[last.bookings.length - 1]!.slot, booking.slot);

    if (canExtend) {
      last.bookings.push(booking);
      last.slotLabel = formatAggregatedSlotLabel(last.bookings.map((b) => b.slot));
      if (booking.confirmedAt < last.confirmedAt) last.confirmedAt = booking.confirmedAt;
      if (booking.expiresAt > last.expiresAt) last.expiresAt = booking.expiresAt;
      last.mhoaApproved = last.mhoaApproved && booking.mhoaApproved;
      continue;
    }

    groups.push({
      id: booking.id,
      date: booking.date,
      court: booking.court,
      facility: booking.facility,
      slotLabel: booking.slot,
      bookings: [booking],
      confirmedAt: booking.confirmedAt,
      expiresAt: booking.expiresAt,
      mhoaApproved: booking.mhoaApproved,
    });
  }

  return groups;
}

export function participantLabelsForGroup(group: ConfirmedBookingGroup): string[] {
  return group.bookings.map((b) => {
    if (b.residentId) return b.fullName.split(" ")[0] ?? b.fullName;
    return b.fullName;
  });
}
