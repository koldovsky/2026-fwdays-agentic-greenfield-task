import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StopListItem } from "@/components/route-details/stop-list-item";
import type { TravelDay } from "@/lib/route-engine";
import {
  estimateDurationMinutes,
  formatDurationUk,
} from "@/lib/itinerary-metrics";
import { t } from "@/lib/i18n";

type DayGroupCardProps = {
  day: TravelDay;
};

export function DayGroupCard({ day }: DayGroupCardProps) {
  const duration = formatDurationUk(estimateDurationMinutes(day.distanceKm));

  return (
    <Card className="rounded-lg bg-card text-foreground ring-foreground/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold leading-tight text-foreground">
          {t("itinerary.dayTitle")} {day.dayIndex + 1}
        </CardTitle>
        <p className="font-mono text-sm tabular-nums text-foreground">
          {day.distanceKm} km · {duration}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="list-none space-y-1 text-foreground">
          {day.stops.map((stop, index) => (
            <StopListItem
              key={`${stop.kind}-${stop.distanceFromStartKm}-${index}`}
              stop={stop}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
