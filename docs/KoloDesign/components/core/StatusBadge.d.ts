import React from "react";

export type Status =
  | "done" | "approved" | "responded"
  | "collecting" | "declined"
  | "draft" | "sent" | "pending";

/**
 * Status pill with built-in low-chroma color mapping.
 * @startingPoint section="Core" subtitle="Status pill — collecting / done / sent / declined" viewport="700x100"
 */
export interface StatusBadgeProps {
  status?: Status;
  /** Override the displayed text; defaults to the status word. */
  label?: string;
  style?: React.CSSProperties;
}

export function StatusBadge(props: StatusBadgeProps): JSX.Element;
