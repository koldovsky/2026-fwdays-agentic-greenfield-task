// Waterings section on the plant detail page (design D6). Server-renderable
// shell: the section heading, the add form (a client island), and the list
// ordered date DESC then id DESC (already sorted by the query — SC-3) OR a clear
// empty state. Each row is a client island (inline edit + delete-with-confirm).
// Sits alongside the measurements section without colliding (design R7): its own
// heading, its own field ids scoped to the form island.
//
// @trace FR-WATER-03
// @trace SC-3
// @trace NFR-A11Y-03
import { WateringForm } from "@/components/watering/WateringForm";
import { WateringRow } from "@/components/watering/WateringRow";
import type { Watering } from "@/db/schema/watering";
import { uk } from "@/lib/i18n/uk";

export interface WateringsSectionProps {
  plantId: number;
  /** Already ordered date DESC, id DESC by the query (SC-3). */
  waterings: Watering[];
  /** Today in Kiev (YYYY-MM-DD) for the add/edit form date default + bound. */
  today: string;
}

export function WateringsSection({
  plantId,
  waterings,
  today,
}: WateringsSectionProps) {
  return (
    <section className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {uk.watering.sectionTitle}
      </h2>

      <div className="mt-4">
        <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {uk.watering.addTitle}
        </h3>
        <WateringForm plantId={plantId} today={today} />
      </div>

      <div className="mt-8">
        {waterings.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {uk.watering.empty}
          </p>
        ) : (
          <ul className="space-y-2">
            {waterings.map((w) => (
              <WateringRow
                key={w.id}
                id={w.id}
                plantId={plantId}
                wateredOn={w.wateredOn}
                note={w.note}
                today={today}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
