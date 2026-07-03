import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default "primary" */
  variant?: "primary" | "secondary" | "ghost";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Stretch to full container width. @default false */
  block?: boolean;
  disabled?: boolean;
  /** Optional icon node before the label. */
  leadingIcon?: React.ReactNode;
  /** Optional icon node after the label. */
  trailingIcon?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Pill-shaped honey-amber action button — the one primary action per screen.
 * @startingPoint section="Core" subtitle="Pill action button, 3 variants" viewport="700x150"
 */
export function Button(props: ButtonProps): JSX.Element;
