import * as React from 'react';

/** Hashtag-style pill for book tags and shelves. */
export interface TagProps {
  children?: React.ReactNode;
  /** Optional leading color dot (e.g. a shelf / highlighter color) */
  color?: string;
  /** Selected appearance (fills ballpoint blue) */
  active?: boolean;
  /** Shows an × that calls this when clicked */
  onRemove?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  /** @default "md" */
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export function Tag(props: TagProps): JSX.Element;
