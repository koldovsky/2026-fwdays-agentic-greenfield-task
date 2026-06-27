import React from "react";

/**
 * One full-width scale answer in the respondent form.
 * @startingPoint section="Forms" subtitle="Labelled scale answer option" viewport="700x220"
 */
export interface ScaleOptionProps {
  /** The numeric value shown in mono on the left (e.g. "1"–"5"). */
  value: string | number;
  /** Behavioural anchor text. */
  label: string;
  selected?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function ScaleOption(props: ScaleOptionProps): JSX.Element;
