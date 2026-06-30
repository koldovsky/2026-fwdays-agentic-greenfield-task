import * as React from 'react';

/** Props for the provenance line. */
export interface AsOfBadgeProps {
  /** Effective date string, e.g. "29.06.2026". Rendered in mono. */
  date: string;
  /** Weekend / holiday — the rate is the previous business day's. */
  stale?: boolean;
  /** Source label. Default "НБУ". */
  source?: string;
  style?: React.CSSProperties;
}

/** Honest provenance line: effective date + official-NBU attribution, with a plain stale note. */
export function AsOfBadge(props: AsOfBadgeProps): JSX.Element;
