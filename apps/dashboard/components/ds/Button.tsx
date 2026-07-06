"use client";

// apps/dashboard/components/ds — Button + IconButton (dashboard tasks.md
// §6.3). Thin, token-driven, no business logic — every colour/spacing/
// radius value comes from a CSS variable so the component recolours with
// the theme automatically (DESIGN.md's "Components" intro).

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icon.tsx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  iconLeft?: IconName;
  iconRight?: IconName;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand text-text-on-brand hover:bg-brand-hover",
  secondary: "bg-surface text-text border border-border hover:bg-surface-hover",
  ghost: "bg-transparent text-text-secondary hover:bg-surface-hover",
  danger: "bg-transparent text-[color:var(--status-declined-fg)] border border-[color:var(--status-declined-solid)] hover:bg-[color:var(--status-declined-bg)]",
};

export function Button({ variant = "secondary", iconLeft, iconRight, className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium
        transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]
        disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {iconLeft ? <Icon name={iconLeft} size={16} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={16} /> : null}
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  variant?: ButtonVariant;
}

export function IconButton({ icon, label, variant = "ghost", className = "", ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md
        transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)]
        disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}
