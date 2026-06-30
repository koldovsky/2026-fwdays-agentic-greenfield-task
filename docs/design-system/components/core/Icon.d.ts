import * as React from 'react';

/** Props for the Lucide icon wrapper. */
export interface IconProps {
  /** Lucide icon name, e.g. "trending-up", "arrow-right-left". */
  name: string;
  /** Pixel size (square). Default 20. */
  size?: number;
  /** Stroke width. Default 1.75 (the brand's calm weight). */
  stroke?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Accessible label; when set the icon is exposed to AT, otherwise hidden. */
  label?: string;
}

/** Thin wrapper over Lucide at the brand's 1.75 stroke. */
export function Icon(props: IconProps): JSX.Element;
