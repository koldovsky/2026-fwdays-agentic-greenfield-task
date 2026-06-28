import { uk } from "@/lib/i18n/uk";

function formatTime(isoStr: string, timezone: string): string {
  if (!isoStr) return "--:--";
  try {
    return new Intl.DateTimeFormat("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    }).format(new Date(isoStr));
  } catch {
    // Unknown timezone fallback — render UTC
    return new Intl.DateTimeFormat("uk-UA", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(new Date(isoStr));
  }
}

export function SunriseSunset({
  sunriseIso,
  sunsetIso,
  timezone,
}: {
  sunriseIso: string;
  sunsetIso: string;
  timezone: string;
}) {
  const sunrise = formatTime(sunriseIso, timezone);
  const sunset = formatTime(sunsetIso, timezone);

  return (
    <div className="flex items-center justify-center gap-6 text-xs text-text-secondary">
      <span className="flex items-center gap-1.5">
        {/* Sunrise icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-accent"
          aria-hidden="true"
        >
          <path d="M12 2v4M4.93 10.93l2.83 2.83M2 18h2M20 18h2M18.07 10.93l-2.83 2.83M12 6a6 6 0 0 1 6 6H6a6 6 0 0 1 6-6z" />
          <line x1="2" y1="22" x2="22" y2="22" />
        </svg>
        <span className="font-sans uppercase tracking-wider text-text-muted">
          {uk.forecast.sunrise}
        </span>
        <span className="font-mono tabular-nums text-text">{sunrise}</span>
      </span>

      <span className="flex items-center gap-1.5">
        {/* Sunset icon */}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-brand"
          aria-hidden="true"
        >
          <path d="M12 10v4M4.93 13.07l2.83 2.83M2 18h2M20 18h2M18.07 13.07l-2.83 2.83M12 6a6 6 0 0 1 6 6H6a6 6 0 0 1 6-6z" />
          <line x1="2" y1="22" x2="22" y2="22" />
        </svg>
        <span className="font-sans uppercase tracking-wider text-text-muted">
          {uk.forecast.sunset}
        </span>
        <span className="font-mono tabular-nums text-text">{sunset}</span>
      </span>
    </div>
  );
}
