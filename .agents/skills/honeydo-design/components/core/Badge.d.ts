import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** @default "accent" */
  tone?: "accent" | "success" | "neutral" | "gold";
  children?: React.ReactNode;
}

/** Small count/status badge. */
export function Badge(props: BadgeProps): JSX.Element;
