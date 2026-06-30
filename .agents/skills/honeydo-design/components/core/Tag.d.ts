import React from "react";

export type TagColor = "amber" | "gold" | "green" | "clay" | "plum" | "teal" | "blue" | "brown" | string;

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Preset name or any CSS color for the dot. @default "amber" */
  color?: TagColor;
  /** @default "md" */
  size?: "sm" | "md";
  children?: React.ReactNode;
}

/** Small color-dotted tag used to categorize time entries. */
export function Tag(props: TagProps): JSX.Element;
export declare const TAG_COLORS: Record<string, string>;
