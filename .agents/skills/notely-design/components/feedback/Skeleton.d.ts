import * as React from "react";
/** Shimmer loading placeholder. */
export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
  width?: number | string;
  height?: number;
  radius?: string;
  circle?: boolean;
}
export declare function Skeleton(props: SkeletonProps): JSX.Element;
