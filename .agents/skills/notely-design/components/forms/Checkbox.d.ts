import * as React from "react";

/** Boolean checkbox with optional indeterminate state and label. */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  checked?: boolean;
  indeterminate?: boolean;
  label?: React.ReactNode;
}
export declare function Checkbox(props: CheckboxProps): JSX.Element;
