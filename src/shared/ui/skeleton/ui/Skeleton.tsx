// Loading placeholder block (docs/vouch-design-system motion contract).
// Presentational and server-safe: a token-colored block with a gentle opacity
// pulse (the `.skeleton` class in globals.css) that signals in-flight work
// without shifting layout (CLS 0, NFR-PERF-04). Decorative by default —
// aria-hidden so assistive tech ignores it; the surrounding surface owns the
// spoken `role="status"` text (NFR-OBS-01, NFR-A11Y-01).

export interface SkeletonProps {
  /** Extra utilities for sizing/shape (width, height, radius). */
  readonly className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div aria-hidden="true" className={`skeleton rounded-sm bg-hairline ${className}`} />;
}
