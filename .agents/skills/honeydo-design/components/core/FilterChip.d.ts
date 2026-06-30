import React from "react";

export interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selected (amber-filled) state. @default false */
  selected?: boolean;
  /** Optional leading color dot (CSS color). */
  dot?: string;
  children?: React.ReactNode;
}

/** Selectable filter chip for the History tag-filter row. */
export function FilterChip(props: FilterChipProps): JSX.Element;
