import React from "react";

/**
 * Thin 4px progress / coverage bar.
 * @startingPoint section="Data" subtitle="4px green progress / coverage bar" viewport="700x80"
 */
export interface ProgressBarProps {
  /** Fraction filled, 0–1. */
  value?: number;
  style?: React.CSSProperties;
}

export function ProgressBar(props: ProgressBarProps): JSX.Element;
