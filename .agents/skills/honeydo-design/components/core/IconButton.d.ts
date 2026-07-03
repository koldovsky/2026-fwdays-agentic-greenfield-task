import React from "react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** @default "soft" */
  variant?: "soft" | "accent" | "outline" | "plain";
  /** Diameter in px. @default 40 */
  size?: number;
  /** Accessible label (icon-only). */
  label?: string;
  disabled?: boolean;
  /** The icon node. */
  children?: React.ReactNode;
}

/** Circular icon-only button for nav and quick actions. */
export function IconButton(props: IconButtonProps): JSX.Element;
