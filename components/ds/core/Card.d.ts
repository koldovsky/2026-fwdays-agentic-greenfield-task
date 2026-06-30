import * as React from 'react';

/** Props for the surface primitive. */
export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> {
  /** Lift 2px + raise shadow on hover; sets pointer cursor. */
  interactive?: boolean;
  /** Add a brand-coloured ring (selected state). */
  selected?: boolean;
  /** Inner padding (any CSS length / token). Default --space-5. */
  padding?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** The brand's surface primitive — warm white, calm border, low shadow. */
export function Card(props: CardProps): JSX.Element;
