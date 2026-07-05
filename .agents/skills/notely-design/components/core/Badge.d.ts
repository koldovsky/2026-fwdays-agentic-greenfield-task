import * as React from "react";
/** Small status/count label. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "primary" | "success" | "warning" | "danger" | "info";
  variant?: "soft" | "solid";
  dot?: boolean;
}
export declare function Badge(props: BadgeProps): JSX.Element;
