import * as React from 'react';

export interface RatePoint {
  /** X-axis label, e.g. "12.06". */
  label: string;
  /** Official UAH rate that day. */
  rate: number;
}

/** Props for the rate-history chart. */
export interface RateChartProps {
  /** ~30 daily points, oldest first. */
  data: RatePoint[];
  /** Pixel height. Default 240. */
  height?: number;
  /** Line/area colour. Default brand. */
  color?: string;
  style?: React.CSSProperties;
}

/** A calm ~30-day line of one currency's official UAH rate (Recharts). */
export function RateChart(props: RateChartProps): JSX.Element;
