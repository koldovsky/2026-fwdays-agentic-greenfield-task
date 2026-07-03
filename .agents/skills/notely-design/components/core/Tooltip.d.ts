import * as React from "react";
/** Hover/focus hint tooltip. */
export interface TooltipProps extends React.HTMLAttributes<HTMLSpanElement> {
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}
export declare function Tooltip(props: TooltipProps): JSX.Element;
