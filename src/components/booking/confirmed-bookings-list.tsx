"use client";

import { useEffect, useState } from "react";

import { getResidentById } from "@/lib/booking/residents";
import type { ConfirmedBooking } from "@/lib/booking/confirmed/types";

function participantLabel(booking: ConfirmedBooking): string {
  if (booking.residentId) {
    return getResidentById(booking.residentId)?.label ?? booking.fullName;
  }
  return booking.fullName;
}

function formatExpiresAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ConfirmedBookingsList() {
  const [bookings, setBookings] = useState<ConfirmedBooking[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/booking/confirmed");
      const data = (await res.json()) as { bookings: ConfirmedBooking[] };
      setBookings(data.bookings);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading your bookings…</p>;
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <p className="text-zinc-600">No upcoming confirmed bookings.</p>
        <p className="mt-2 text-sm text-zinc-500">
          Successful MHOA reservations appear here until the slot time passes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {bookings.map((booking) => (
          <li
            key={booking.id}
            className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-emerald-950">
                  {participantLabel(booking)}
                </p>
                <p className="mt-1 text-sm text-zinc-600">
                  {booking.date} · {booking.court} · {booking.slot}
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                {booking.mhoaApproved ? "Confirmed" : "Demo"}
              </span>
            </div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Facility</dt>
                <dd className="text-zinc-900">{booking.facility}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Booked for</dt>
                <dd className="text-zinc-900">{booking.fullName}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Confirmed</dt>
                <dd className="text-zinc-900">
                  {new Date(booking.confirmedAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Visible until</dt>
                <dd className="text-zinc-900">{formatExpiresAt(booking.expiresAt)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => void refresh()}
        className="text-sm font-medium text-violet-700 underline"
      >
        Refresh
      </button>
    </div>
  );
}
