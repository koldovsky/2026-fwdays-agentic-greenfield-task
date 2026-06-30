import * as React from 'react';

export interface ConverterLabels {
  amountInForeign: (code: string) => string;
  amountInUah: string;
  resultInUah: string;
  resultInForeign: (code: string) => string;
  swap: string;
}

/**
 * Props for the official-rate converter.
 *
 * @startingPoint section="Rates" subtitle="UAH ⇄ foreign converter at the official rate" viewport="420x320"
 */
export interface ConverterProps {
  /** ISO code of the foreign currency. */
  code?: string;
  /** Official UAH rate per 1 unit of `code`. */
  rate?: number;
  /** Initial amount string (locale-aware: "100,50" ok). Default "100". */
  defaultAmount?: string;
  /** Optional label overrides; defaults preserve DS preview strings. */
  labels?: Partial<ConverterLabels>;
  style?: React.CSSProperties;
}

/** UAH ⇄ foreign converter at the official rate, with a direction swap. */
export function Converter(props: ConverterProps): JSX.Element;
