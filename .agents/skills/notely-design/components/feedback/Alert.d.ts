import * as React from "react";
/** Inline contextual banner. */
export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: "info" | "success" | "warning" | "danger";
  title?: string;
  onClose?: () => void;
}
export declare function Alert(props: AlertProps): JSX.Element;
