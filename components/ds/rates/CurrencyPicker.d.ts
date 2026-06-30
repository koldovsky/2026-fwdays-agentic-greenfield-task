import * as React from 'react';

export interface CurrencyItem {
  code: string;
  name: string;
  flag?: string;
  rate: number;
  unit?: number;
  delta?: number;
}

/**
 * Props for the filterable currency list.
 *
 * @startingPoint section="Rates" subtitle="Filterable currency list with inline empty state" viewport="460x420"
 */
export interface CurrencyPickerProps {
  /** Full currency list. */
  currencies: CurrencyItem[];
  /** Currently focused code. */
  selected?: string;
  onSelect?: (code: string) => void;
  /** Controlled filter text (optional). */
  query?: string;
  onQueryChange?: (q: string) => void;
  /** Max list height before scroll. Default 320. */
  maxHeight?: number;
  style?: React.CSSProperties;
}

/** A free-form filter over the currency list, with a calm inline empty state. */
export function CurrencyPicker(props: CurrencyPickerProps): JSX.Element;
