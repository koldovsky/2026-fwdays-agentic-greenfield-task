"use client";

// Chart render-failure boundary (FR-CHART-03, NFR-A11Y-03). The charts are
// prop-driven client islands — the data is fetched server-side and passed in,
// so there is no chart-level async load to fail. But a Recharts render error
// would otherwise crash the whole plant detail page (the nearest Next error
// boundary is the full-page "raw 500"). This boundary contains that blast
// radius: if a wrapped chart throws while rendering, it shows a non-blocking
// Ukrainian fallback ("chart unavailable — see the list below") instead, so the
// underlying measurements/waterings LISTS on the same page stay readable
// (NFR-A11Y-03). The fallback is role="alert" — semantically an error, distinct
// from ChartEmptyState's role="status" empty panel (FR-CHART-03).
//
// React error boundaries must be class components (no hook equivalent for
// getDerivedStateFromError / componentDidCatch).
//
// @trace FR-CHART-03
// @trace NFR-A11Y-03
import { Component, type ReactNode } from "react";

export interface ChartErrorBoundaryProps {
  /** Ukrainian fallback message shown when the wrapped chart throws. */
  fallbackMessage: string;
  /** The chart island this boundary protects. */
  children: ReactNode;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
}

export class ChartErrorBoundary extends Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  state: ChartErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    // The chart is non-essential (the list below is the canonical readable
    // view), so the page must NOT crash — log the cause for diagnosis and
    // degrade to the inline fallback (external/render failures never fail
    // silently).
    console.error("Chart failed to render; showing inline fallback.", error);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-[16rem] items-center justify-center rounded-md border border-amber-300 bg-amber-50 p-6 text-center text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-300"
        >
          {this.props.fallbackMessage}
        </div>
      );
    }

    return this.props.children;
  }
}
