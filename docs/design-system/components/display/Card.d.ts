import * as React from 'react';

/** Paper card — base surface for books, notes and panels. */
export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  /** Element tag. @default "div" */
  as?: any;
  /** @default "md" */
  padding?: 'sm' | 'md' | 'lg' | number;
  /** Hover-lift affordance for clickable cards */
  interactive?: boolean;
  /** Notebook ruled-line paper */
  ruled?: boolean;
  /** Left accent spine color (e.g. a highlighter color) */
  accent?: string;
  children?: React.ReactNode;
}

export function Card(props: CardProps): JSX.Element;
