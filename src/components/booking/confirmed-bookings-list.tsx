"use client";

import { useEffect, useState } from "react";

import {
  groupConsecutiveConfirmedBookings,
  participantLabelsForGroup,
} from "@/lib/booking/confirmed/group-display";
import type { ConfirmedBooking } from "@/lib/booking/confirmed/types";

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

  const groups = groupConsecutiveConfirmedBookings(bookings);

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading your bookings…</p>;
  }

  if (groups.length === 0) {
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
        {groups.map((group) => {
          const participants = participantLabelsForGroup(group);
          const isGroup = group.bookings.length > 1;

          return (
            <li
              key={group.id}
              className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-emerald-950">
                    {isGroup ? participants.join(", ") : group.bookings[0]!.fullName}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {group.date} · {group.court} · {group.slotLabel}
                  </p>
                  {isGroup && (
                    <p className="mt-1 text-xs text-zinc-500">
                      {group.bookings.length} consecutive slots ·{" "}
                      {group.bookings.map((b) => b.fullName).join(" · ")}
                    </p>
                  )}
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                  {group.mhoaApproved ? "Confirmed" : "Demo"}
                </span>
              </div>
              <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-zinc-500">Facility</dt>
                  <dd className="text-zinc-900">{group.facility}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">{isGroup ? "Players" : "Booked for"}</dt>
                  <dd className="text-zinc-900">
                    {group.bookings.map((b) => b.fullName).join(", ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Confirmed</dt>
                  <dd className="text-zinc-900">
                    {new Date(group.confirmedAt).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Visible until</dt>
                  <dd className="text-zinc-900">{formatExpiresAt(group.expiresAt)}</dd>
                </div>
              </dl>
            </li>
          );
        })}
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
