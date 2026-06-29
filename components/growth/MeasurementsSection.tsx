// Measurements section on the plant detail page (design D6). Server-renderable
// shell: the section heading, the add form (a client island), and the list
// ordered date DESC then id DESC (already sorted by the query — SC-3) OR a clear
// empty state. Each row is a client island (inline edit + delete-with-confirm).
//
// @trace FR-GROWTH-02
// @trace SC-3
// @trace NFR-A11Y-03
import { MeasurementForm } from "@/components/growth/MeasurementForm";
import { MeasurementRow } from "@/components/growth/MeasurementRow";
import type { Measurement } from "@/db/schema/growth";
import { uk } from "@/lib/i18n/uk";

export interface MeasurementsSectionProps {
  plantId: number;
  /** Already ordered date DESC, id DESC by the query (SC-3). */
  measurements: Measurement[];
  /** Today in Kiev (YYYY-MM-DD) for the add/edit form date default + bound. */
  today: string;
}

export function MeasurementsSection({
  plantId,
  measurements,
  today,
}: MeasurementsSectionProps) {
  return (
    <section className="mt-10 border-t border-zinc-200 pt-8 dark:border-zinc-800">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">
        {uk.growth.sectionTitle}
      </h2>

      <div className="mt-4">
        <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
          {uk.growth.addTitle}
        </h3>
        <MeasurementForm plantId={plantId} today={today} />
      </div>

      <div className="mt-8">
        {measurements.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {uk.growth.empty}
          </p>
        ) : (
          <ul className="space-y-2">
            {measurements.map((m) => (
              <MeasurementRow
                key={m.id}
                id={m.id}
                plantId={plantId}
                heightCm={m.heightCm}
                measuredOn={m.measuredOn}
                today={today}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
