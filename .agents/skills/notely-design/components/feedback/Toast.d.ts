import * as React from "react";
/** Transient confirmation toast. Place inside a fixed stack. */
export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  message: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}
export declare function Toast(props: ToastProps): JSX.Element;
