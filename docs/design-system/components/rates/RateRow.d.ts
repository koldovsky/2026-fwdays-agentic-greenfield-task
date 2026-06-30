import * as React from 'react';

/**
 * Props for one currency line in the rates list.
 *
 * @startingPoint section="Rates" subtitle="Currency row — code, name, official rate, daily move" viewport="700x150"
 */
export interface RateRowProps {
  /** ISO 4217 code, e.g. "USD". */
  code: string;
  /** Ukrainian currency name, e.g. "Долар США". */
  name: string;
  /** Optional flag emoji. */
  flag?: string;
  /** Official UAH rate per `unit` of the currency. */
  rate: number;
  /** Units the rate is quoted per (e.g. 100 for JPY). Default 1. */
  unit?: number;
  /** Day-over-day change in percent (drives the trend pill). */
  delta?: number;
  selected?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/** One currency line — leads with the official rate, then the daily move. */
export function RateRow(props: RateRowProps): JSX.Element;
