import * as React from "react";

/** Single-line text input with label, adornments, and validation. */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** Field label rendered above the control. */
  label?: string;
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Helper text below the field. */
  helperText?: string;
  /** Error message — turns the field red and overrides helperText. */
  error?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export declare function Input(props: InputProps): JSX.Element;
