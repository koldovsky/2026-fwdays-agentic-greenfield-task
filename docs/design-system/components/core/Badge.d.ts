import * as React from 'react';

/** Props for the status pill. */
export interface BadgeProps {
  /** Semantic tone. Default "neutral". */
  tone?: 'brand' | 'up' | 'down' | 'flat' | 'accent' | 'neutral';
  /** Fill with the tone colour instead of the soft tint. */
  solid?: boolean;
  /** Render content in tabular mono (for numbers). */
  mono?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** A small status pill keyed to brand + trend semantics. */
export function Badge(props: BadgeProps): JSX.Element;
