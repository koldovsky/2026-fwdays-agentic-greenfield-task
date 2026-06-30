import React from "react";

export interface SegmentedOption { value: string; label: string; }

export interface SegmentedControlProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** Options as strings or {value,label}. */
  options: Array<string | SegmentedOption>;
  value: string;
  onChange?: (value: string) => void;
}

/** iOS segmented control — e.g. the Light / Dark / System theme switch. */
export function SegmentedControl(props: SegmentedControlProps): JSX.Element;
