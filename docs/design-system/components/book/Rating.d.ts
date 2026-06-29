import * as React from 'react';

/**
 * Bookshelf's signature 1–10 score. Ten pips fill to the value with a
 * red→teal color ramp; interactive when `onChange` is supplied.
 * @startingPoint section="Book" subtitle="1–10 rating control" viewport="700x120"
 */
export interface RatingProps {
  /** 0–10 */
  value?: number;
  /** Makes the control interactive */
  onChange?: (value: number) => void;
  readOnly?: boolean;
  /** Show the mono "9/10" number @default true */
  showNumber?: boolean;
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export function Rating(props: RatingProps): JSX.Element;
