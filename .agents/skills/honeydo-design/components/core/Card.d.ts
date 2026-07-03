import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shadow depth. @default 1 */
  elevation?: 0 | 1 | 2 | 3;
  /** Amber running-timer glow ring. @default false */
  glow?: boolean;
  /** Inner padding in px. @default 16 */
  padding?: number;
  children?: React.ReactNode;
}

/** Surface card — base container for entries, stats, settings groups. */
export function Card(props: CardProps): JSX.Element;
