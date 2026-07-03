import * as React from "react";
/** User avatar with image, initials fallback, and status dot. */
export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  status?: "online" | "away" | "offline";
}
export declare function Avatar(props: AvatarProps): JSX.Element;
