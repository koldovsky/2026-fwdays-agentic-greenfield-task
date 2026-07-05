"use client";

import React from "react";

/**
 * Notely IconButton — square, icon-only action.
 * Variants: ghost | solid | outline. Sizes map to 16/20/24 icons.
 */
export function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  active = false,
  disabled = false,
  onClick,
  style,
  ...rest
}) {
  const sizes = { sm: 28, md: 34, lg: 40 };
  const box = sizes[size] || sizes.md;
  const [hover, setHover] = React.useState(false);

  const base = {
    ghost: { background: active ? "var(--color-selected)" : "transparent", color: active ? "var(--color-primary)" : "var(--color-text-secondary)" },
    solid: { background: "var(--color-primary)", color: "var(--color-on-primary)" },
    outline: { background: "var(--color-card)", color: "var(--color-text)", border: "1px solid var(--color-border-strong)" },
  }[variant];

  let bg = base.background;
  if (!disabled) {
    if (variant === "ghost") bg = hover ? "var(--color-hover)" : base.background;
    if (variant === "solid") bg = hover ? "var(--color-primary-hover)" : base.background;
    if (variant === "outline") bg = hover ? "var(--color-hover)" : base.background;
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-focus)")}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: box,
        height: box,
        color: base.color,
        background: bg,
        border: base.border || "1px solid transparent",
        borderRadius: "var(--radius-md)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? "var(--opacity-disabled)" : 1,
        transition: "background var(--duration-fast) var(--ease-standard)",
        outline: "none",
        ...style,
      }}
      {...rest}
    >
      {icon}
    </button>
  );
}