import * as React from 'react';

/** Single-line text field with label, hint and error states. */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  /** Error message — replaces hint and reddens the border */
  error?: string;
  iconLeft?: React.ReactNode;
  /** @default "md" */
  size?: 'sm' | 'md';
}

export function Input(props: InputProps): JSX.Element;
