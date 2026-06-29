"use client";

// A single watering row (design D6): shows the date as DD.MM.YYYY + the note (or
// a clear "no note" affordance), with an inline edit toggle (same WateringForm,
// prefilled) and a delete-with-confirm control. Edit is keyed by the row contents
// so the form re-syncs after a save/navigation.
//
// @trace FR-WATER-03
// @trace FR-WATER-04
// @trace SC-3
import { useState } from "react";

import { DeleteWateringButton } from "@/components/watering/DeleteWateringButton";
import { WateringForm } from "@/components/watering/WateringForm";
import { formatAcquiredDate } from "@/lib/dates";
import { uk } from "@/lib/i18n/uk";

export interface WateringRowProps {
  id: number;
  plantId: number;
  wateredOn: string;
  note: string | null;
  /** Today in Kiev (YYYY-MM-DD) for the edit form's date bounds/default. */
  today: string;
}

export function WateringRow({
  id,
  plantId,
  wateredOn,
  note,
  today,
}: WateringRowProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
        <WateringForm
          // Re-key by the row contents so the edit form re-syncs after a save.
          key={`${id}-${wateredOn}-${note ?? ""}`}
          plantId={plantId}
          id={id}
          today={today}
          defaults={{ wateredOn, note: note ?? "" }}
          onSaved={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
      <span className="text-sm text-foreground">
        <span className="font-medium">{formatAcquiredDate(wateredOn)}</span>
        <span className="mx-2 text-zinc-400">·</span>
        {note ? (
          <span className="text-zinc-600 dark:text-zinc-400">{note}</span>
        ) : (
          <span className="italic text-zinc-400 dark:text-zinc-500">
            {uk.watering.noNote}
          </span>
        )}
      </span>
      <span className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="inline-flex items-center rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          {uk.watering.edit}
        </button>
        <DeleteWateringButton id={id} plantId={plantId} />
      </span>
    </li>
  );
}
