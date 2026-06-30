import * as React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

/** Props for the brand-styled dropdown. */
export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size' | 'style'> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** Options as strings or {value,label} objects. */
  options?: Array<string | SelectOption>;
  /** Leading Lucide icon name. */
  icon?: string;
  size?: 'md' | 'lg';
  disabled?: boolean;
  style?: React.CSSProperties;
}

/** A calm native dropdown wrapped to match the brand. */
export function Select(props: SelectProps): JSX.Element;
