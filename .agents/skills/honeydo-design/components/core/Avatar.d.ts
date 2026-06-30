import React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Image URL; falls back to initials when omitted. */
  src?: string;
  /** Full name — initials are derived from it. */
  name?: string;
  /** Diameter in px. @default 44 */
  size?: number;
}

/** Round avatar with image or warm amber-gradient initials. */
export function Avatar(props: AvatarProps): JSX.Element;
