import * as React from 'react';

/** Props for the icon-only control. */
export interface IconButtonProps {
  /** Lucide icon name. */
  icon: string;
  /** Accessible label (required) — also the tooltip. */
  label: string;
  /** Visual style. Default "outline". */
  variant?: 'outline' | 'soft' | 'ghost';
  /** Control size. Default "md". */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

/** A square, icon-only control. Presses to 0.94 scale. */
export function IconButton(props: IconButtonProps): JSX.Element;
