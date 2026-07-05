import * as React from "react";
/** Small indeterminate spinner. */
export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number;
  color?: string;
}
export declare function Spinner(props: SpinnerProps): JSX.Element;
