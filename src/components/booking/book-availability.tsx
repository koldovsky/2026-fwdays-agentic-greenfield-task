"use client";

import { useCallback, useEffect, useState } from "react";

import { AvailabilityPanel, type SlotSelection } from "@/components/booking/availability-panel";
import type { AvailabilityResult } from "@/lib/booking/availability";
import type { TennisCourt } from "@/lib/booking/availability";
import { getBookableDates } from "@/lib/booking/tennis-window";

export type PickedSlot = {
  date: string;
  court: TennisCourt;
  slot: string;
};

type BookAvailabilityProps = {
  selectedDate: string;
  onDateChange: (date: string) => void;
  pickedSlot: PickedSlot | null;
  onPickSlot: (pick: PickedSlot | null) => void;
};

export function BookAvailability({
  selectedDate,
  onDateChange,
  pickedSlot,
  onPickSlot,
}: BookAvailabilityProps) {
  const bookableDates = getBookableDates(new Date(), 7);
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);

  const load = useCallback(async (date: string) => {
    setLoading(true);
    setAvailability(null);
    try {
      const res = await fetch("/api/booking/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      setAvailability((await res.json()) as AvailabilityResult);
    } catch {
      setAvailability({
        status: "error",
        date,
        reason: "Could not load availability.",
        fetchedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(selectedDate);
  }, [selectedDate, load]);

  function handleSelect(sel: SlotSelection) {
    onPickSlot({ date: selectedDate, court: sel.court, slot: sel.slot });
  }

  const panelSelection: SlotSelection | null = pickedSlot
    ? { court: pickedSlot.court, slot: pickedSlot.slot }
    : null;

  return (
    <section
      aria-labelledby="book-availability-heading"
      className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5"
    >
      <div>
        <h2 id="book-availability-heading" className="text-lg font-semibold text-emerald-950">
          Available tennis slots
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          MHOA opens bookings at midnight when a date enters the 7-day window. Pick a slot here, or
          describe your request below.
        </p>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Bookable dates">
        {bookableDates.map((date) => {
          const active = date === selectedDate;
          const label = new Date(date + "T12:00:00").toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          });
          return (
            <button
              key={date}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                onDateChange(date);
                onPickSlot(null);
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-emerald-600 text-white"
                  : "border border-zinc-200 bg-white text-zinc-700 hover:border-emerald-400"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <AvailabilityPanel
        availability={
          availability ?? {
            status: "error",
            date: selectedDate,
            reason: "",
            fetchedAt: "",
          }
        }
        windowStart="00:00"
        windowEnd="23:59"
        selection={panelSelection}
        onSelect={handleSelect}
        loading={loading || !availability}
      />

      {pickedSlot && (
        <p className="text-sm text-emerald-900">
          Selected: <strong>{pickedSlot.court}</strong> · <strong>{pickedSlot.slot}</strong> on{" "}
          <strong>{pickedSlot.date}</strong> — continue below to review and submit.
        </p>
      )}
    </section>
  );
}
