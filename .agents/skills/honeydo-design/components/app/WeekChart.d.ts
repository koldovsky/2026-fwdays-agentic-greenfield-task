import React from "react";

export interface WeekDay {
  /** Short label, e.g. "M". */
  label: string;
  /** Hours tracked that day. */
  hours: number;
  /** Highlight as today (gold). */
  today?: boolean;
}

export interface WeekChartProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Seven days, oldest → newest. */
  data: WeekDay[];
  /** Daily-hours goal — draws a dashed line; met bars turn amber. */
  goal?: number;
  /** Chart height in px. @default 150 */
  height?: number;
}

/** Weekly hours-per-day bar chart with a goal line. */
export function WeekChart(props: WeekChartProps): JSX.Element;
