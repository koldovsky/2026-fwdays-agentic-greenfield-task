import * as React from 'react';

/** Props for the pill toggle. */
export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  /** Trailing label, also the accessible name. */
  label?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}

/** A calm pill toggle — slides, never bounces. */
export function Switch(props: SwitchProps): JSX.Element;
