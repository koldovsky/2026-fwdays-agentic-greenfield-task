import React from "react";

/**
 * Confirmation / decision modal.
 * @startingPoint section="Feedback" subtitle="Centered confirmation dialog with scrim" viewport="700x320"
 */
export interface DialogProps {
  title?: string;
  children: React.ReactNode;
  /** Right-aligned action buttons (usually a ghost Cancel + primary confirm). */
  actions?: React.ReactNode;
  onClose?: () => void;
  open?: boolean;
}

export function Dialog(props: DialogProps): JSX.Element | null;
