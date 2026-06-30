import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label above the input. */
  label?: string;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  /** Style for the outer label/container wrapper. */
  containerStyle?: React.CSSProperties;
}

/** iOS-style filled text field; border warms to amber on focus. */
export function Input(props: InputProps): JSX.Element;
