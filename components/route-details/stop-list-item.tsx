import type { RouteStop, StopKind } from "@/lib/route-engine";
import type { I18nKey } from "@/lib/i18n";
import { t } from "@/lib/i18n";

const STOP_KIND_KEYS: Record<StopKind, I18nKey> = {
  start: "itinerary.stopStart",
  end: "itinerary.stopEnd",
  rest: "itinerary.stopRest",
  overnight: "itinerary.stopOvernight",
};

type StopListItemProps = {
  stop: RouteStop;
};

export function StopListItem({ stop }: StopListItemProps) {
  const label = t(STOP_KIND_KEYS[stop.kind]);
  const title =
    stop.placeName && (stop.kind === "rest" || stop.kind === "overnight")
      ? `${label} · ${stop.placeName}`
      : label;
  const distanceLabel =
    stop.kind === "start"
      ? null
      : `${Math.round(stop.distanceFromStartKm)} km ${t("itinerary.distanceFromStart")}`;

  return (
    <li className="flex flex-col gap-0.5 py-1 text-foreground">
      <span className="text-sm text-foreground">{title}</span>
      {distanceLabel ? (
        <span className="font-mono text-xs tabular-nums text-foreground">
          {distanceLabel}
        </span>
      ) : null}
    </li>
  );
}
