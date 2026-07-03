import * as React from "react";
/**
 * Friendly placeholder for empty views (no notes, no search results).
 * @startingPoint section="Feedback" subtitle="Empty / zero-state block" viewport="700x320"
 */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lucide icon name. @default "inbox" */
  icon?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}
export declare function EmptyState(props: EmptyStateProps): JSX.Element;
