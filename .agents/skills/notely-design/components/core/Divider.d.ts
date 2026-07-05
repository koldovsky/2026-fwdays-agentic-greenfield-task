import * as React from "react";
/** Hairline separator. */
export interface DividerProps extends React.HTMLAttributes<HTMLElement> {
  orientation?: "horizontal" | "vertical";
  label?: string;
  spacing?: number;
}
export declare function Divider(props: DividerProps): JSX.Element;
