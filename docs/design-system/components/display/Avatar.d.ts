import * as React from 'react';

/** Round avatar with image or colored-initials fallback. */
export interface AvatarProps {
  /** Used for initials + fallback color */
  name?: string;
  src?: string;
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export function Avatar(props: AvatarProps): JSX.Element;
