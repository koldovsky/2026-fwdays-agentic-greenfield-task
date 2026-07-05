import * as React from "react";

export type SelectOption = string | { value: string; label: string };

/** Dropdown select backed by a native <select> for accessibility. */
export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  options: SelectOption[];
  placeholder?: string;
}
export declare function Select(props: SelectProps): JSX.Element;
