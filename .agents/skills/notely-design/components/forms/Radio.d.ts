import * as React from "react";

/** Single-select radio button; use within a named group. */
export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  checked?: boolean;
  label?: React.ReactNode;
}
export declare function Radio(props: RadioProps): JSX.Element;
