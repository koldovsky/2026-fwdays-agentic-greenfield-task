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
      className="flex min-h-[16rem] items-center justify-center rounded-[14px] border border-dashed border-border bg-cloud p-6 text-center font-body text-sm text-stone"
    >
      {message}
    </div>
  );
}
