import React from "react";

/**
 * Kolo360 primary action button. One accent (evergreen) primary; everything
 * else is a hairline-bordered secondary or borderless ghost.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { padding: "5px 12px", fontSize: "12px" },
    md: { padding: "8px 16px", fontSize: "13px" },
    lg: { padding: "9px 22px", fontSize: "14px" },
  };
  const variants = {
    primary: {
      background: disabled ? "var(--line-strong)" : "var(--green)",
      color: "#fff",
      border: "none",
    },
    secondary: {
      background: "var(--surface)",
      color: "var(--ink-muted)",
      border: "1px solid var(--line-strong)",
    },
    ghost: {
      background: "transparent",
      color: "var(--ink-muted)",
      border: "none",
    },
    dashed: {
      background: "transparent",
      color: "var(--ink-muted)",
      border: "1px dashed var(--line-strong)",
    },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        fontFamily: "var(--font-ui)",
        fontWeight: "var(--weight-medium)",
        borderRadius: "var(--radius-md)",
        cursor: disabled ? "default" : "pointer",
        lineHeight: 1.2,
        transition: "background var(--motion-fast) var(--ease)",
        ...sizes[size],
        ...variants[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
