import type { AvailabilityResult, CourtAvailability, TennisCourt } from "@/lib/booking/availability";
import { slotInWindow } from "@/lib/booking/availability";

export type SlotSelection = {
  court: TennisCourt;
  slot: string;
};

type AvailabilityPanelProps = {
  availability: AvailabilityResult;
  windowStart: string;
  windowEnd: string;
  selection: SlotSelection | null;
  onSelect: (selection: SlotSelection) => void;
  loading?: boolean;
  takenSlots?: SlotSelection[];
  emptyHint?: string;
  /** startSlot → display label (e.g. combined block for groups) */
  slotLabels?: Partial<Record<TennisCourt, Record<string, string>>>;
  onRetry?: () => void;
};

function slotKey(court: string, slot: string) {
  return `${court}::${slot}`;
}

function CourtColumn({
  court,
  slots,
  windowStart,
  windowEnd,
  selection,
  onSelect,
  takenSlots,
  slotLabels,
}: {
  court: TennisCourt;
  slots: string[];
  windowStart: string;
  windowEnd: string;
  selection: SlotSelection | null;
  onSelect: (selection: SlotSelection) => void;
  takenSlots: SlotSelection[];
  slotLabels?: Record<string, string>;
}) {
  const takenSet = new Set(takenSlots.map((t) => slotKey(t.court, t.slot)));
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <h3 className="font-semibold text-violet-950">{court}</h3>
      {slots.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">No slots available on MHOA for this date.</p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={`${court} available slots`}>
          {slots.map((slot) => {
            const inWindow = slotInWindow(slot, windowStart, windowEnd);
            const selected = selection?.court === court && selection.slot === slot;
            const taken = takenSet.has(slotKey(court, slot));
            const displayLabel = slotLabels?.[slot] ?? slot;
            return (
              <li key={slot}>
                <button
                  type="button"
                  disabled={taken}
                  onClick={() => onSelect({ court, slot })}
                  aria-pressed={selected}
                  title={taken ? "Already assigned to another participant" : undefined}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    selected
                      ? "bg-violet-600 text-white"
                      : taken
                        ? "border border-zinc-200 bg-zinc-100 text-zinc-400"
                        : inWindow
                          ? "border border-emerald-400 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                          : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-violet-300"
                  }`}
                >
                  {displayLabel}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function AvailabilityPanel({
  availability,
  windowStart,
  windowEnd,
  selection,
  onSelect,
  loading,
  takenSlots = [],
  emptyHint,
  slotLabels,
  onRetry,
}: AvailabilityPanelProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-violet-200 bg-white p-4 text-sm text-violet-800" role="status">
        Loading available slots from MHOA for both courts…
      </div>
    );
  }

  if (availability.status === "error") {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-medium">Could not load availability</p>
        <p className="mt-1">{availability.reason}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 rounded-full border border-red-300 bg-white px-4 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-violet-900">Available slots — {availability.date}</p>
        {availability.stub && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Demo data</span>
        )}
      </div>
      <p className="text-xs text-zinc-500">
        {slotLabels && Object.keys(slotLabels).length > 0
          ? "Each block spans back-to-back 45-minute slots — one per person."
          : "Green outline = inside your requested time window. Select a slot on either court before submitting."}
      </p>
      {availability.courts.every((c) => c.slots.length === 0) && emptyHint && (
        <p className="text-sm text-amber-800">{emptyHint}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {availability.courts.map((court: CourtAvailability) => (
          <CourtColumn
            key={court.court}
            court={court.court}
            slots={court.slots}
            windowStart={windowStart}
            windowEnd={windowEnd}
            selection={selection}
            onSelect={onSelect}
            takenSlots={takenSlots}
            slotLabels={slotLabels?.[court.court]}
          />
        ))}
      </div>
      {selection && (
        <p className="text-sm text-zinc-700">
          Selected: <strong>{selection.court}</strong> ·{" "}
          <strong>
            {slotLabels?.[selection.court]?.[selection.slot] ?? selection.slot}
          </strong>
        </p>
      )}
    </div>
  );
}
