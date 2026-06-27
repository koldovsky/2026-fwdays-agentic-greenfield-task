import React from "react";

/**
 * Surface card — the workhorse container.
 * @startingPoint section="Core" subtitle="White hairline-bordered card; interactive + selected states" viewport="700x140"
 */
export interface CardProps {
  children: React.ReactNode;
  /** Clickable row: lightens to #F7F6F2 on hover. */
  interactive?: boolean;
  /** Selected: 2px green border + green tint fill. */
  selected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

export function Card(props: CardProps): JSX.Element;
