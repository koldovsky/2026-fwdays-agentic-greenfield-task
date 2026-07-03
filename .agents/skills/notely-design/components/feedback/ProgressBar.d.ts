import * as React from "react";
/** Determinate or indeterminate progress bar. */
export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0–100. */
  value?: number;
  indeterminate?: boolean;
  tone?: "primary" | "success" | "warning" | "danger";
  height?: number;
}
export declare function ProgressBar(props: ProgressBarProps): JSX.Element;
