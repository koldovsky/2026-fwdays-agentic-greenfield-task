import type { RouteStop } from "@/lib/route-engine";
import { t } from "@/lib/i18n";

type MapStopLabelProps = {
  stop: RouteStop;
};

function stopKindLabel(kind: RouteStop["kind"]): string {
  if (kind === "rest") {
    return t("itinerary.stopRest");
  }
  return t("itinerary.stopOvernight");
}

export function MapStopLabel({ stop }: MapStopLabelProps) {
  const kindLabel = stopKindLabel(stop.kind);
  const title =
    stop.placeName && (stop.kind === "rest" || stop.kind === "overnight")
      ? `${kindLabel} · ${stop.placeName}`
      : kindLabel;

  return (
    <div className="flex flex-col gap-0.5 text-left leading-tight">
      <span className="text-sm font-semibold">
        {t("itinerary.dayTitle")} {stop.dayIndex + 1}
      </span>
      <span className="text-sm">{title}</span>
      <span className="font-mono text-xs tabular-nums">
        {Math.round(stop.distanceFromStartKm)} km {t("itinerary.distanceFromStart")}
      </span>
    </div>
  );
}

export function shouldShowMapStopLabel(stop: RouteStop): boolean {
  return stop.kind === "rest" || stop.kind === "overnight";
}
