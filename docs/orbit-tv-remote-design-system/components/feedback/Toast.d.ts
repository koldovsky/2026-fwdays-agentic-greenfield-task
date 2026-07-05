import type { ReactNode } from 'react';

export type ToastTone = 'info' | 'warning' | 'error';

export interface ToastProps {
  tone?: ToastTone;
  /** Material Symbols Rounded icon name. Defaults per tone (info/warning/error). */
  icon?: string;
  children?: ReactNode;
  onDismiss?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}
