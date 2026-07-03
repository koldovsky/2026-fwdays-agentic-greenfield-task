import * as React from "react";
/** Surface container with optional hover-lift. */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: number;
  interactive?: boolean;
  /** Resting elevation 0–5. @default 1 */
  elevation?: number;
}
export declare function Card(props: CardProps): JSX.Element;
