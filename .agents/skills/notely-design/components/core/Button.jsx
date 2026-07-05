"use client";

import React from "react";

/**
 * Notely Button — primary action control.
 * Variants: primary | secondary | ghost | danger
 * Sizes: sm | md | lg
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  disabled = false,
  loading = false,
  type = "button",
  onClick,
  style,
  ...rest
}) {
  const sizes = {
    sm: { h: 30, px: 10, fs: 13, gap: 6, icon: 16 },
    md: { h: 36, px: 14, fs: 14, gap: 8, icon: 18 },
    lg: { h: 44, px: 18, fs: 15, gap: 8, icon: 20 },
  };
  const s = sizes[size] || sizes.md;

  const variants = {
    primary: {
      background: "var(--color-primary)",
      color: "var(--color-on-primary)",
      border: "1px solid transparent",
    },
    secondary: {
      background: "var(--color-card)",
      color: "var(--color-text)",
      border: "1px solid var(--color-border-strong)",
    },
    ghost: {
      background: "transparent",
      color: "var(--color-text)",
      border: "1px solid transparent",
    },
    danger: {
      background: "var(--color-danger)",
      color: "#fff",
      border: "1px solid transparent",
    },
  };
  const v = variants[variant] || variants.primary;

  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);

  let bg = v.background;
  if (!disabled && variant === "primary") bg = active ? "var(--color-primary-pressed)" : hover ? "var(--color-primary-hover)" : v.background;
  if (!disabled && variant === "danger") bg = hover ? "var(--red-500)" : v.background;
  if (!disabled && (variant === "secondary" || variant === "ghost"))
    bg = active ? "var(--color-pressed)" : hover ? "var(--color-hover)" : v.background;

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)}
      onMouseUp={() => setActive(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        height: s.h,
        padding: `0 ${s.px}px`,
        width: fullWidth ? "100%" : "auto",
        fontFamily: "var(--font-sans)",
        fontSize: s.fs,
        fontWeight: "var(--fw-medium)",
        lineHeight: 1,
        color: v.color,
        background: bg,
        border: v.border,
        borderRadius: "var(--radius-md)",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled ? "var(--opacity-disabled)" : 1,
        transform: active && !disabled ? "scale(0.98)" : "scale(1)",
        transition: "background var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)",
        outline: "none",
        whiteSpace: "nowrap",
        ...style,
      }}
      onFocus={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-focus)")}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
      {...rest}
    >
      {loading ? <Spinner size={s.icon} /> : leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}

function Spinner({ size = 16 }) {
  return (
    <span
      style={{
        width: size, height: size,
        border: "2px solid currentColor",
        borderRightColor: "transparent",
        borderRadius: "50%",
        display: "inline-block",
        animation: "notely-spin 0.6s linear infinite",
      }}
    />
  );
}