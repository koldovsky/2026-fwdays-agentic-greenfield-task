import type { CSSProperties } from "react";

// Shimmering placeholder. Compose these to mirror a loaded layout's footprint so
// data arrival causes no layout shift (FR-STATS-05). Uses the ds-shimmer keyframe.
export function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded-sm ${className}`}
      style={{
        background:
          "linear-gradient(90deg, var(--surface-track) 25%, var(--border) 37%, var(--surface-track) 63%)",
        backgroundSize: "200% 100%",
        animation: "ds-shimmer 1.4s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

// Loading placeholder for the stats page — mirrors the loaded footprint (profile,
// 15-cell grid, and the chart panels) so data arrival causes no layout shift
// (FR-STATS-05).
export function StatsSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-content flex-col gap-6 px-6 py-10">
      <div className="flex items-start gap-6 border-b border-border pb-7">
        <Skeleton className="size-[112px] rounded-full" />
        <div className="flex-1 space-y-3 pt-1">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-2">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="space-y-3 bg-surface px-4 py-[18px]">
              <Skeleton className="h-3 w-[55%]" />
              <Skeleton className="h-6 w-[45%]" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <PanelSkeleton />
        <PanelSkeleton />
      </div>
      <PanelSkeleton lines={4} />
      <PanelSkeleton lines={2} />
      <PanelSkeleton lines={6} />
    </div>
  );
}

function PanelSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <Skeleton className="mb-5 h-6 w-40" />
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}
