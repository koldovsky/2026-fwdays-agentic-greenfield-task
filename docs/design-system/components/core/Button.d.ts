import * as React from 'react';

/**
 * Props for the brand's primary action control.
 *
 * @startingPoint section="Core" subtitle="Treasury-green action button, four variants" viewport="700x150"
 */
export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'style'> {
  /** Visual style. Default "primary". */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  /** Control height. Default "md". */
  size?: 'sm' | 'md' | 'lg';
  /** Lucide icon name shown before the label. */
  iconLeft?: string;
  /** Lucide icon name shown after the label. */
  iconRight?: string;
  /** Stretch to fill the container width. */
  fullWidth?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** The brand's primary action control — composed, lightly rounded, gentle press. */
export function Button(props: ButtonProps): JSX.Element;
