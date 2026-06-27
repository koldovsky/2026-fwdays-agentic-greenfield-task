import React from "react";

/**
 * Surface card: white fill, hairline border, 8px radius, no shadow.
 * `interactive` adds row-hover lightening; `selected` promotes to a 2px
 * green border + tint fill.
 */
export function Card({ children, interactive = false, selected = false, onClick, style = {} }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? "var(--green-tint-1)" : "var(--surface)",
        border: selected
          ? "2px solid var(--green)"
          : "1px solid var(--line-soft)",
        borderRadius: "var(--radius-md)",
        cursor: interactive ? "pointer" : "default",
        transition: "background var(--motion-fast) var(--ease)",
        ...style,
      }}
      {...(interactive && !selected
        ? { onMouseEnter: (e) => (e.currentTarget.style.background = "#F7F6F2"),
            onMouseLeave: (e) => (e.currentTarget.style.background = "var(--surface)") }
        : {})}
    >
      {children}
    </div>
  );
}
