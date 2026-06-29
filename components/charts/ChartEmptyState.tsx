// Shared chart empty-state panel (design D4, FR-CHART-03). Shown INSTEAD of a
// Recharts plot when a chart's series is empty, so the Owner never sees a blank
// panel with zeroed/degenerate axes. It is semantically and visually distinct
// from a loading or error state: a neutral informational `status` region with a
// dashed placeholder frame (not the red/alert styling an error would use). The
// per-chart Ukrainian message is passed in by the caller.
//
// @trace FR-CHART-03
// @trace NFR-A11Y-04

export interface ChartEmptyStateProps {
  /** Per-chart Ukrainian empty-state message (e.g. uk.charts.growthEmpty). */
  message: string;
}

export function ChartEmptyState({ message }: ChartEmptyStateProps) {
  return (
    <div
      role="status"
      className="flex min-h-[16rem] items-center justify-center rounded-md border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400"
    >
      {message}
    </div>
  );
}
