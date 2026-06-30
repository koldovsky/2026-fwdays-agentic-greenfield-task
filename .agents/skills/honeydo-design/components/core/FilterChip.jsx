import React from "react";

/**
 * Selectable filter chip for the History tag-filter row.
 * Fills amber when selected; soft surface when not.
 */
export function FilterChip({ children, selected = false, dot, style = {}, ...rest }) {
  return (
    <button
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        height: 34,
        padding: "0 14px",
        fontFamily: "var(--font-text)",
        fontSize: "var(--text-subhead)",
        fontWeight: "var(--weight-semibold)",
        color: selected ? "var(--on-accent)" : "var(--text)",
        background: selected ? "var(--accent)" : "var(--fill-soft)",
        border: "1px solid transparent",
        borderRadius: "var(--radius-pill)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "background var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-settle), color var(--dur-fast)",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      {...rest}
    >
      {dot && <span style={{ width: 8, height: 8, borderRadius: "50%", background: selected ? "var(--on-accent)" : dot, flex: "none" }} />}
      {children}
    </button>
  );
}
