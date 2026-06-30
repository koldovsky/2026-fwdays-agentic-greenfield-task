import * as React from 'react';

/** Movement bucket for a percentage delta. */
export type TrendTone = 'up' | 'down' | 'flat';

/** Resolve a signed percentage to a movement tone (±flatBand reads flat). */
export function trendTone(deltaPct: number, flatBand?: number): TrendTone;

/**
 * Props for the signature movement read.
 *
 * @startingPoint section="Rates" subtitle="Signed delta pill — strengthen / weaken / flat" viewport="700x120"
 */
export interface TrendBadgeProps {
  /** Signed change, e.g. 1.2 or -0.4. Sign drives colour + arrow. */
  delta: number;
  /** Unit suffix. Default "%". */
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Fill with the tone colour instead of the soft tint. */
  solid?: boolean;
  /** Moves within ±this read as flat. Default 0.05. */
  flatBand?: number;
  /** Show the leading +/− sign. Default true. */
  showSign?: boolean;
  style?: React.CSSProperties;
}

/** Direction arrow + signed delta in the honest semantic colour. */
export function TrendBadge(props: TrendBadgeProps): JSX.Element;
