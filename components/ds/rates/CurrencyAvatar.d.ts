import * as React from 'react';

/** Props for the currency roundel. */
export interface CurrencyAvatarProps {
  /** ISO 4217 code, e.g. "USD". Shown when no flag is given. */
  code?: string;
  /** Optional flag emoji — the single sanctioned emoji in the system. */
  flag?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

/** A calm roundel identifying a currency by ISO code (or flag emoji). */
export function CurrencyAvatar(props: CurrencyAvatarProps): JSX.Element;
