import React from "react";

/**
 * Honeydo primary action button. Pill-shaped, honey-amber fill,
 * calm press settle. One primary action per screen.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  block = false,
  disabled = false,
  leadingIcon = null,
  trailingIcon = null,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { padding: "8px 16px", fontSize: 15, height: 36, gap: 6 },
    md: { padding: "12px 22px", fontSize: 17, height: 48, gap: 8 },
    lg: { padding: "16px 26px", fontSize: 18, height: 56, gap: 10 },
  };
  const s = sizes[size] || sizes.md;

  const variants = {
    primary: {
      background: "var(--accent)",
      color: "var(--on-accent)",
      border: "1px solid transparent",
      boxShadow: "var(--shadow-2)",
    },
    secondary: {
      background: "var(--surface-alt)",
      color: "var(--text)",
      border: "1px solid var(--border)",
      boxShadow: "none",
    },
    ghost: {
      background: "transparent",
      color: "var(--accent)",
      border: "1px solid transparent",
      boxShadow: "none",
    },
  };
  const v = variants[variant] || variants.primary;

  return (
    <button
      disabled={disabled}
      style={{
        display: block ? "flex" : "inline-flex",
        width: block ? "100%" : "auto",
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        height: s.height,
        padding: s.padding,
        fontFamily: "var(--font-rounded)",
        fontWeight: "var(--weight-bold)",
        fontSize: s.fontSize,
        letterSpacing: "var(--tracking-tight)",
        borderRadius: "var(--radius-pill)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "transform var(--dur-fast) var(--ease-settle), background var(--dur-fast) var(--ease-standard), filter var(--dur-fast)",
        WebkitTapHighlightColor: "transparent",
        ...v,
        ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.96)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      {...rest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
