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
import { Button } from "@/components/ui/Button";
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
      <li className="rounded-[14px] border border-border bg-cloud p-4">
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
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border bg-cloud p-4">
      <span className="font-body text-sm text-ink">
        <span className="font-semibold">{formatAcquiredDate(wateredOn)}</span>
        <span className="mx-2 text-border">·</span>
        {note ? (
          <span className="text-stone">{note}</span>
        ) : (
          <span className="italic text-placeholder">{uk.watering.noNote}</span>
        )}
      </span>
      <span className="flex items-center gap-2">
        <Button variant="secondary" type="button" onClick={() => setEditing(true)}>
          {uk.watering.edit}
        </Button>
        <DeleteWateringButton id={id} plantId={plantId} />
      </span>
    </li>
  );
}
