import * as React from 'react';

export interface SelectOption { value: string; label: string; }

/** Styled native select. Pass `options` or `<option>` children. */
export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  hint?: string;
  options?: (string | SelectOption)[];
  /** @default "md" */
  size?: 'sm' | 'md';
}

export function Select(props: SelectProps): JSX.Element;
