import * as React from "react";

/** On/off pill toggle for settings (theme, sync, reminders). */
export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  checked?: boolean;
  label?: React.ReactNode;
}
export declare function Switch(props: SwitchProps): JSX.Element;
