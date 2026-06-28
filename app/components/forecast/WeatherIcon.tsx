import type { ReactElement } from "react";
import { weatherCodeToIcon, type WeatherIconId } from "@/lib/forecast/weatherIcon";

// Inline SVG weather icons — Lucide-style, 1.75 stroke, 24px grid.
// Bespoke set avoids icon-library bundle weight. Inherits currentColor.

function IconClear({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconPartlyCloudy({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2v2M4.22 4.22l1.42 1.42M2 12h2M19.78 4.22l-1.42 1.42" />
      <circle cx="12" cy="10" r="3" />
      <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
      <path d="M8 19a4 4 0 1 1 8 0H8z" />
    </svg>
  );
}

function IconOvercast({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />
    </svg>
  );
}

function IconFog({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 10h18M3 14h18M3 18h18" />
      <path d="M5 6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3" />
    </svg>
  );
}

function IconDrizzle({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.5 14H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />
      <line x1="8" y1="19" x2="8" y2="21" />
      <line x1="12" y1="17" x2="12" y2="19" />
      <line x1="16" y1="19" x2="16" y2="21" />
    </svg>
  );
}

function IconRain({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.5 14H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />
      <line x1="8" y1="19" x2="6" y2="23" />
      <line x1="12" y1="19" x2="10" y2="23" />
      <line x1="16" y1="19" x2="14" y2="23" />
    </svg>
  );
}

function IconSnow({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.5 14H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />
      <line x1="8" y1="19" x2="8" y2="23" />
      <line x1="6" y1="21" x2="10" y2="21" />
      <line x1="16" y1="19" x2="16" y2="23" />
      <line x1="14" y1="21" x2="18" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="10" y1="19" x2="14" y2="19" />
    </svg>
  );
}

function IconThunderstorm({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M17.5 14H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />
      <polyline points="13 17 11 21 15 21 13 25" />
    </svg>
  );
}

const ICONS: Record<WeatherIconId, (props: { size: number }) => ReactElement> = {
  clear: IconClear,
  "partly-cloudy": IconPartlyCloudy,
  overcast: IconOvercast,
  fog: IconFog,
  drizzle: IconDrizzle,
  rain: IconRain,
  snow: IconSnow,
  thunderstorm: IconThunderstorm,
};

export function WeatherIcon({
  weatherCode,
  size = 24,
  className,
}: {
  weatherCode: number;
  size?: number;
  className?: string;
}) {
  const id = weatherCodeToIcon(weatherCode);
  const Icon = ICONS[id];
  return (
    <span className={className}>
      <Icon size={size} />
    </span>
  );
}
