import * as React from 'react';

/** Binary on/off toggle. Works controlled or uncontrolled. */
export interface SwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
  /** @default "md" */
  size?: 'sm' | 'md';
  style?: React.CSSProperties;
}

export function Switch(props: SwitchProps): JSX.Element;
