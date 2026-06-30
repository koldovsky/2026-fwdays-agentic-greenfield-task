import * as React from 'react';

/** Props for the compact pill selector / token. */
export interface ChipProps {
  /** Leading Lucide icon name. */
  icon?: string;
  /** Selected state — green tint + brand border. */
  active?: boolean;
  onClick?: () => void;
  /** When provided, renders a trailing × that calls this. */
  onRemove?: () => void;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/** A compact, pill-shaped selector / token. */
export function Chip(props: ChipProps): JSX.Element;
