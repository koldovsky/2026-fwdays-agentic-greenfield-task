// Primary interaction control for Vouch UI (see docs/vouch-design-system Button).
// Presentational + server-renderable: press feedback via `active:` utility, no hooks.
import type { ReactNode } from "react";

export interface ButtonProps {
  /** Button text — alternative to children. */
  readonly label?: string;
  /** Button text as children. */
  readonly children?: ReactNode;
  /** Visual style variant. */
  readonly variant?: "primary" | "secondary" | "ghost" | "dark";
  /** Size preset. */
  readonly size?: "sm" | "md" | "lg";
  /** Disabled state — prevents click, shows muted style. */
  readonly disabled?: boolean;
  /** Button behavior in forms; ignored when `href` is set. */
  readonly type?: "button" | "submit";
  /** Click handler. */
  readonly onClick?: () => void;
  /** When set, render a link (`<a>`) styled as a button instead of a `<button>`. */
  readonly href?: string;
  /** Accessible name when the content is not descriptive on its own. */
  readonly "aria-label"?: string;
}

// Hover lift + press feedback are transform/color only (no layout shift). The
// global :focus-visible halo (globals.css) stays intact; disabled state drops
// all hover/press affordance. duration-150 matches --hover-duration.
// The `<button>` disabled visual uses `disabled:` (matches :disabled); the link
// form has no `disabled` attribute, so it degrades to aria-disabled and mirrors
// the same muted state via `aria-disabled:` — `pointer-events-none` also blocks
// hover so a disabled link never shows the lift/color affordance.
const base =
  "inline-flex items-center justify-center font-body font-semibold leading-none " +
  "whitespace-nowrap select-none cursor-pointer " +
  "transition-[opacity,transform,background-color,color,box-shadow] duration-150 " +
  "hover:-translate-y-px active:translate-y-0 active:scale-[0.97] " +
  "disabled:cursor-not-allowed disabled:translate-y-0 disabled:bg-surface-canvas " +
  "disabled:text-ink-faint disabled:border-transparent disabled:shadow-none " +
  "aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed " +
  "aria-disabled:translate-y-0 aria-disabled:bg-surface-canvas " +
  "aria-disabled:text-ink-faint aria-disabled:border-transparent aria-disabled:shadow-none";

const variantClass: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-brand text-white shadow-brand hover:bg-brand-hover hover:shadow-brand-strong",
  secondary: "bg-surface-card text-ink border border-hairline hover:border-ink-faint",
  ghost: "bg-transparent text-brand hover:bg-brand-wash",
  dark: "bg-ink text-white hover:shadow-lifted",
};

const sizeClass: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "text-sm px-4 py-2 rounded-sm",
  md: "text-base px-[22px] py-3 rounded-md",
  lg: "text-md px-7 py-[14px] rounded-[12px]",
};

export function Button({
  label,
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  onClick,
  href,
  "aria-label": ariaLabel,
}: ButtonProps) {
  const className = `${base} ${variantClass[variant]} ${sizeClass[size]}`;
  const content = label ?? children;

  // Link form: used for navigation CTAs so a button never nests inside an anchor.
  // `disabled` degrades to aria-disabled since <a> has no disabled attribute.
  if (href !== undefined) {
    return (
      <a
        href={disabled ? undefined : href}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        className={className}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      aria-label={ariaLabel}
      className={className}
    >
      {content}
    </button>
  );
}
