"use client";

// A single measurement row (design D6): shows the height in cm + the date as
// DD.MM.YYYY, with an inline edit toggle (same MeasurementForm, prefilled) and a
// delete-with-confirm control. Edit is keyed by the row contents so the form
// re-syncs after a save/navigation.
//
// @trace FR-GROWTH-02
// @trace FR-GROWTH-03
// @trace SC-3
import { useState } from "react";

import { DeleteMeasurementButton } from "@/components/growth/DeleteMeasurementButton";
import { MeasurementForm } from "@/components/growth/MeasurementForm";
import { formatAcquiredDate } from "@/lib/dates";
import { uk } from "@/lib/i18n/uk";

export interface MeasurementRowProps {
  id: number;
  plantId: number;
  heightCm: number;
  measuredOn: string;
  /** Today in Kiev (YYYY-MM-DD) for the edit form's date bounds/default. */
  today: string;
}

/** Format a stored REAL height to at most one decimal place for display. */
function formatHeight(heightCm: number): string {
  return Number.isInteger(heightCm)
    ? String(heightCm)
    : heightCm.toFixed(1);
}

export function MeasurementRow({
  id,
  plantId,
  heightCm,
  measuredOn,
  today,
}: MeasurementRowProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
        <MeasurementForm
          // Re-key by the row contents so the edit form re-syncs after a save.
          key={`${id}-${heightCm}-${measuredOn}`}
          plantId={plantId}
          id={id}
          today={today}
          defaults={{ heightCm: formatHeight(heightCm), measuredOn }}
          onSaved={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <span className="text-sm text-foreground">
        <span className="font-medium">
          {formatHeight(heightCm)} {uk.growth.heightUnit}
        </span>
        <span className="mx-2 text-zinc-400">·</span>
        <span className="text-zinc-600 dark:text-zinc-400">
          {formatAcquiredDate(measuredOn)}
        </span>
      </span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {uk.growth.edit}
        </button>
        <DeleteMeasurementButton id={id} plantId={plantId} />
      </span>
    </li>
  );
}
