import { uk } from "@/lib/i18n/uk";
import type { ForecastDay } from "@/lib/forecast/types";
import { comfortScore } from "@/lib/scoring/comfort";
import { WeatherIcon } from "./WeatherIcon";

function isToday(dateStr: string): boolean {
  // Compare YYYY-MM-DD portions using UTC date parts to avoid timezone issues
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return dateStr === `${y}-${m}-${d}`;
}

function comfortBadgeClass(value: number): string {
  if (value >= 70) return "bg-comfort-good-bg text-comfort-good-fg";
  if (value >= 40) return "bg-comfort-fair-bg text-comfort-fair-fg";
  return "bg-comfort-poor-bg text-comfort-poor-fg";
}

export function DayCard({ day }: { day: ForecastDay }) {
  const today = isToday(day.date);
  const comfort = comfortScore(day);

  return (
    <article
      aria-label={day.weekdayUk}
      className={[
        "flex w-full flex-col items-center gap-2 rounded-lg border p-3 text-center shadow-sm transition-shadow",
        today ? "border-brand bg-brand-soft" : "border-border bg-surface hover:shadow-md",
      ].join(" ")}
    >
      {/* Weekday */}
      <span className="text-xs font-medium capitalize text-text-secondary">{day.weekdayUk}</span>

      {/* Weather icon */}
      <WeatherIcon weatherCode={day.weatherCode} size={28} className="text-brand" />

      {/* Hi / Lo — each on its own line */}
      <div className="flex flex-col items-center font-mono text-sm leading-tight tabular-nums">
        <span className="font-semibold text-text">{day.highC}°</span>
        <span className="text-text-muted">{day.lowC}°</span>
      </div>

      {/* Precip + Wind */}
      <div className="flex w-full flex-col gap-0.5">
        <span className="font-mono text-xs text-text-secondary tabular-nums">
          {day.precipProbability}%{" "}
          <span className="font-sans text-text-muted">{uk.forecast.precipLabel.toLowerCase()}</span>
        </span>
        <span className="font-mono text-xs text-text-secondary tabular-nums">
          {day.windSpeedKmh} <span className="font-sans text-text-muted">км/г</span>
        </span>
      </div>

      {/* Comfort badge */}
      <span
        className={[
          "w-full rounded-pill px-2 py-0.5 text-center font-mono text-xs font-semibold tabular-nums",
          comfortBadgeClass(comfort.value),
        ].join(" ")}
        aria-label={`${uk.comfort.badgeLabel}: ${comfort.value}`}
        title={comfort.rationale}
      >
        {comfort.value}
      </span>
    </article>
  );
}
