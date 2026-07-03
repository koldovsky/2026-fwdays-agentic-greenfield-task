import React from "react";

/**
 * Circular icon-only button (nav actions, quick continue, etc.).
 * Pass the icon node as children.
 */
export function IconButton({
  children,
  variant = "soft",
  size = 40,
  disabled = false,
  label,
  style = {},
  ...rest
}) {
  const variants = {
    soft:   { background: "var(--fill-soft)", color: "var(--text)", border: "1px solid transparent" },
    accent: { background: "var(--accent)", color: "var(--on-accent)", border: "1px solid transparent" },
    outline:{ background: "transparent", color: "var(--text)", border: "1px solid var(--border)" },
    plain:  { background: "transparent", color: "var(--text-muted)", border: "1px solid transparent" },
  };
  const v = variants[variant] || variants.soft;
  return (
    <button
      aria-label={label}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "var(--radius-pill)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transition: "transform var(--dur-fast) var(--ease-settle), background var(--dur-fast)",
        WebkitTapHighlightColor: "transparent",
        ...v,
        ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.9)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      {...rest}
    >
      {children}
    </button>
  );
}
