import * as React from 'react';

/** Square, icon-only button. Always pass `label` for accessibility. */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** @default "ghost" */
  variant?: 'ghost' | 'solid' | 'outline';
  /** @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Accessible label (also the tooltip) */
  label: string;
  /** Toggled-on appearance (ghost only) */
  active?: boolean;
  /** Lucide icon node */
  children?: React.ReactNode;
}

export function IconButton(props: IconButtonProps): JSX.Element;
