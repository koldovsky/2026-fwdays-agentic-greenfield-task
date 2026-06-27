import React from "react";

/**
 * Transient confirmation toast (bottom-right dark pill).
 * @startingPoint section="Feedback" subtitle="Bottom-right confirmation toast" viewport="700x120"
 */
export interface ToastProps {
  /** When falsy, renders nothing. Caller controls the auto-dismiss timer. */
  message?: string;
  style?: React.CSSProperties;
}

export function Toast(props: ToastProps): JSX.Element | null;
