import React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "dashed";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * Kolo360 action button.
 * @startingPoint section="Core" subtitle="Primary / secondary / ghost / dashed action button" viewport="700x120"
 */
export interface ButtonProps {
  children: React.ReactNode;
  /** primary = evergreen fill; secondary = hairline border; ghost = borderless; dashed = add-row affordance. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  style?: React.CSSProperties;
}

export function Button(props: ButtonProps): JSX.Element;
