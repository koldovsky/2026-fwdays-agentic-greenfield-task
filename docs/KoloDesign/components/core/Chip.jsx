import React from "react";

/** A small outlined chip — methodology tags, channel labels, audience hints. */
export function Chip({ children, mono = false, style = {} }) {
  return (
    <span
      style={{
        fontSize: "var(--text-xs)",
        fontFamily: mono ? "var(--font-mono)" : "var(--font-ui)",
        color: "var(--ink-muted)",
        border: "1px solid var(--line-strong)",
        borderRadius: "var(--radius-sm)",
        padding: "2px 6px",
        display: "inline-block",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
