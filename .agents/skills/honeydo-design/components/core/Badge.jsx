import React from "react";

/**
 * Small status/count badge. `tone` maps to semantic colors.
 */
export function Badge({ children, tone = "accent", style = {}, ...rest }) {
  const tones = {
    accent:  { background: "var(--accent)", color: "var(--on-accent)" },
    success: { background: "var(--success)", color: "#10240F" },
    neutral: { background: "var(--fill-soft)", color: "var(--text)" },
    gold:    { background: "var(--highlight-gold)", color: "#2A1B05" },
  };
  const t = tones[tone] || tones.accent;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 20,
        height: 20,
        padding: "0 7px",
        fontFamily: "var(--font-rounded)",
        fontSize: 12,
        fontWeight: "var(--weight-bold)",
        lineHeight: 1,
        borderRadius: "var(--radius-pill)",
        ...t,
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
