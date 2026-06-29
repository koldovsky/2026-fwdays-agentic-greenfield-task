import * as React from 'react';

/**
 * Primary control for Bookshelf. One solid `primary` action per view.
 * @startingPoint section="Core" subtitle="Button variants & sizes" viewport="700x150"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight. @default "primary" */
  variant?: 'primary' | 'secondary' | 'ghost' | 'soft' | 'danger';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Icon node rendered before the label */
  iconLeft?: React.ReactNode;
  /** Icon node rendered after the label */
  iconRight?: React.ReactNode;
  /** Stretch to full width */
  block?: boolean;
  children?: React.ReactNode;
}

export function Button(props: ButtonProps): JSX.Element;
