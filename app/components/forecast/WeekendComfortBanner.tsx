import { uk } from "@/lib/i18n/uk";
import type { ForecastDay } from "@/lib/forecast/types";
import { comfortScore } from "@/lib/scoring/comfort";

function badgeClass(value: number): string {
  if (value >= 70) return "bg-comfort-good-bg text-comfort-good-fg border-comfort-good";
  if (value >= 40) return "bg-comfort-fair-bg text-comfort-fair-fg border-comfort-fair";
  return "bg-comfort-poor-bg text-comfort-poor-fg border-comfort-poor";
}

interface Props {
  days: ForecastDay[];
}

export function WeekendComfortBanner({ days }: Props) {
  const saturday = days.find((d) => new Date(d.date).getDay() === 6);
  const sunday = days.find((d) => new Date(d.date).getDay() === 0);

  if (!saturday || !sunday) return null;

  const satResult = comfortScore(saturday);
  const sunResult = comfortScore(sunday);
  const avg = Math.round((satResult.value + sunResult.value) / 2);
  const rationale = satResult.value >= sunResult.value ? satResult.rationale : sunResult.rationale;

  return (
    <div
      className={[
        "flex items-center justify-between rounded-lg border px-4 py-3",
        badgeClass(avg),
      ].join(" ")}
      aria-label={`${uk.comfort.weekendLabel}: ${uk.comfort.badgeLabel} ${avg}`}
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-medium uppercase tracking-wide opacity-70">
          {uk.comfort.weekendLabel}
        </span>
        <span className="text-xs opacity-80">{rationale}</span>
      </div>
      <span className="font-mono text-3xl font-bold tabular-nums">{avg}</span>
    </div>
  );
}
