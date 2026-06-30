import * as React from 'react';

/** Props for the single-line text field. */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'style' | 'value' | 'onChange'> {
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  /** Leading Lucide icon name. */
  icon?: string;
  /** Field height. Default "md". */
  size?: 'md' | 'lg';
  /** Show a trailing spinner (e.g. while filtering). */
  loading?: boolean;
  disabled?: boolean;
  /** Render the value in tabular mono — use for amount entry. */
  mono?: boolean;
  /** Text alignment of the value. Default "left". */
  align?: 'left' | 'right';
  /** Trailing unit label, e.g. "₴" or "USD". */
  suffix?: React.ReactNode;
  style?: React.CSSProperties;
  inputStyle?: React.CSSProperties;
}

/** Single-line text field — sunken surface, calm focus ring, optional mono value. */
export function Input(props: InputProps): JSX.Element;
