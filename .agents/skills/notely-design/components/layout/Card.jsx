"use client";

import React from "react";

/** Notely Card — surface container. Optional hover-lift and clickable. */
export function Card({ children, padding = 16, interactive = false, elevation = 1, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const shadow = `var(--shadow-${interactive && hover ? Math.min(elevation + 1, 5) : elevation})`;
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--color-card)",
        border: `1px solid ${interactive && hover ? "var(--color-border-strong)" : "var(--color-border)"}`,
        borderRadius: "var(--radius-lg)",
        boxShadow: shadow,
        padding,
        cursor: interactive ? "pointer" : "default",
        transition: "box-shadow var(--duration-base) var(--ease-standard), border-color var(--duration-base)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}