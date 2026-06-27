import React from "react";

/**
 * The signature five-dot score readout (filled = ink, empty = grey).
 * @startingPoint section="Data" subtitle="Five-dot score readout" viewport="700x90"
 */
export interface ScaleDotsProps {
  /** Score, 0–max; rounded to whole filled dots. */
  value?: number;
  max?: number;
  size?: number;
  gap?: number;
  style?: React.CSSProperties;
}

export function ScaleDots(props: ScaleDotsProps): JSX.Element;
