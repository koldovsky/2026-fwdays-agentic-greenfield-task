import React from "react";

export interface SelectOption { value: string; label: string; }

/**
 * Native select styled to match Input.
 * @startingPoint section="Forms" subtitle="Styled native select" viewport="700x110"
 */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: (string | SelectOption)[];
  fill?: "white" | "paper";
  style?: React.CSSProperties;
}

export function Select(props: SelectProps): JSX.Element;
