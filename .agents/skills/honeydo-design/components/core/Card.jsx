import React from "react";

/**
 * Surface card. The base container for entries, stats, and settings
 * groups. Soft warm shadow, generous radius. `glow` lights the amber
 * running-timer ring.
 */
export function Card({ children, elevation = 1, glow = false, padding = 16, style = {}, ...rest }) {
  const shadows = {
    0: "none",
    1: "var(--shadow-1)",
    2: "var(--shadow-2)",
    3: "var(--shadow-3)",
  };
  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${glow ? "var(--accent-soft)" : "var(--border)"}`,
        borderRadius: "var(--radius-md)",
        boxShadow: glow ? "var(--shadow-glow)" : shadows[elevation],
        padding,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
