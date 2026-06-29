import * as React from 'react';

/** Small status label (reading state, draft, count). */
export interface BadgeProps {
  children?: React.ReactNode;
  /** @default "neutral" */
  tone?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger';
  /** Leading status dot */
  dot?: boolean;
  style?: React.CSSProperties;
}

export function Badge(props: BadgeProps): JSX.Element;
