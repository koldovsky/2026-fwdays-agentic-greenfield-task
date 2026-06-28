// Placeholder rendered while the Leaflet bundle loads (next/dynamic loading prop).
// Matches the map footprint (h-80, rounded-xl) to prevent layout shift.
// animate-pulse is suppressed by prefers-reduced-motion via Tailwind's motion-safe variant.
export function MapSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="h-full w-full rounded-xl border border-border bg-surface-sunken motion-safe:animate-pulse"
    />
  );
}
