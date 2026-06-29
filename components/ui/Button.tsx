// «Поливайко» Button (design D4, FR-DS-02). A single variant-prop component
// covering the six design variants. Renders a real <button> (keyboard-operable,
// accessible name from children/aria-label, default type=button so it never
// implicitly submits) unless `href` is given, in which case it renders a styled
// next/link <Link> with the same visual treatment. A stable `data-variant`
// attribute exposes which variant is rendered.

import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "soft"
  | "ghost"
  | "danger"
  | "icon";

// Shared base: Quicksand 600, rounded, gentle color transition, visible focus
// ring (NFR-A11Y-04).
const base =
  "inline-flex items-center justify-center gap-2 font-display font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-60 disabled:cursor-not-allowed";

// Per-variant classes mapping the D4 table onto the design tokens.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "rounded-[14px] bg-forest px-6 py-3 text-[15px] text-paper hover:bg-forest-hover",
  secondary:
    "rounded-[14px] border-[1.5px] border-forest bg-transparent px-6 py-3 text-[15px] text-forest hover:bg-mist",
  soft: "rounded-[14px] bg-mist px-6 py-3 text-[15px] text-pine hover:bg-soft-hover",
  ghost:
    "rounded-[14px] bg-transparent px-6 py-3 text-[15px] text-stone hover:bg-ghost-hover",
  danger:
    "rounded-[14px] bg-danger px-6 py-3 text-[15px] text-paper hover:bg-danger-hover",
  icon: "h-12 w-12 rounded-[14px] bg-clay text-paper hover:bg-forest",
};

/** The composed class string for a variant — exported so a presentational
    affordance (e.g. an action styled like a Button but living INSIDE a card
    link, where a nested <button> would be invalid) can reuse the exact look. */
export function buttonClasses(
  variant: ButtonVariant,
  className?: string,
): string {
  return [base, VARIANT_CLASSES[variant], className].filter(Boolean).join(" ");
}

function classes(variant: ButtonVariant, className?: string): string {
  return buttonClasses(variant, className);
}

type ButtonAsButton = {
  variant?: ButtonVariant;
  href?: undefined;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

type ButtonAsLink = {
  variant?: ButtonVariant;
  href: string;
  children?: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export function Button(props: ButtonProps) {
  const { variant = "primary", className, children, ...rest } = props;

  if ("href" in props && props.href !== undefined) {
    const { href, ...anchorRest } =
      rest as Omit<ButtonAsLink, "variant" | "className" | "children">;
    return (
      <Link
        href={href}
        data-variant={variant}
        className={classes(variant, className)}
        {...anchorRest}
      >
        {children}
      </Link>
    );
  }

  const { type, ...buttonRest } =
    rest as Omit<ButtonAsButton, "variant" | "className" | "children">;
  return (
    <button
      type={type ?? "button"}
      data-variant={variant}
      className={classes(variant, className)}
      {...buttonRest}
    >
      {children}
    </button>
  );
}
