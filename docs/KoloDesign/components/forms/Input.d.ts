import React from "react";

/**
 * Labelled text input.
 * @startingPoint section="Forms" subtitle="Labelled text input with optional hint" viewport="700x110"
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Small dimmed suffix on the label, e.g. "(optional)". */
  hint?: string;
  /** "white" (default) on paper backgrounds, "paper" inside white cards. */
  fill?: "white" | "paper";
  style?: React.CSSProperties;
}

export function Input(props: InputProps): JSX.Element;
