import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "accent" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  // primary = inverted (text-colored fill), the default page CTA
  primary: "bg-text text-bg hover:opacity-90",
  accent: "bg-accent-primary text-white hover:opacity-90",
  secondary: "border border-border bg-transparent text-text hover:opacity-80",
  ghost: "bg-transparent text-text-muted hover:text-text",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

// Design-system button (DESIGN.md forms/Button). Light-to-medium weight, calm
// opacity transitions, visible focus ring for accessibility (NFR-A11Y-01).
export function Button({
  variant = "primary",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-[26px] py-3 font-sans text-[15px] font-semibold transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
