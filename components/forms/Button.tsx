import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Kolo360 action button (BC-BRAND-01), ported from
 * `docs/KoloDesign/components/core/Button`. One accent (evergreen) primary per
 * view; everything else is a hairline-bordered secondary or a borderless ghost.
 * Tokens + the shared `focus-ring` give the visible 2px accent focus ring
 * (NFR-A11Y-01). No 700 weight, no shadow, only a slight hover darken.
 */
export type ButtonVariant = "primary" | "secondary" | "ghost";

const base =
  "focus-ring inline-flex items-center justify-center rounded-[var(--radius-md)] " +
  "px-[var(--space-7)] py-[var(--space-5)] text-[var(--text-base)] font-[var(--weight-medium)] " +
  "leading-[var(--leading-tight)] transition-colors duration-[var(--motion-fast)] " +
  "disabled:cursor-default disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-surface hover:bg-[var(--green-ink)] disabled:bg-line-strong",
  secondary: "border border-line-strong bg-surface text-ink-muted hover:bg-[var(--line-faint)]",
  ghost: "bg-transparent text-ink-muted hover:bg-[var(--line-faint)]",
};

export function Button({
  children,
  variant = "primary",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  return (
    <button
      {...rest}
      className={`${base} ${variants[variant]}${className ? ` ${className}` : ""}`}
    >
      {children}
    </button>
  );
}
