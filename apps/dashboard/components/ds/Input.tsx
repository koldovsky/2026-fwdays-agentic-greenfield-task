// apps/dashboard/components/ds — Input (dashboard tasks.md §6.3). Thin,
// token-driven text input — used by the future Question inbox's answer
// field (`kb-learning`, S5) and any admin form this dashboard grows.

import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      className={`w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text
        placeholder:text-text-muted
        focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    />
  );
}
