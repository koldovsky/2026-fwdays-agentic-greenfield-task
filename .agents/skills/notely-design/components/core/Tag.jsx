"use client";

import React from "react";

/** Notely Tag — removable label for note tags. Supports a color dot. */
export function Tag({ children, color, removable = false, onRemove, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const clickable = Boolean(onClick) && !removable;
  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      onFocus={clickable ? (e) => (e.currentTarget.style.boxShadow = "var(--shadow-focus)") : undefined}
      onBlur={clickable ? (e) => (e.currentTarget.style.boxShadow = "none") : undefined}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        height: 24, padding: "0 8px",
        background: hover && onClick ? "var(--color-hover)" : "var(--color-bg)",
        border: "1px solid var(--color-border)",
        color: "var(--color-text-secondary)",
        fontSize: 12, fontWeight: "var(--fw-medium)",
        borderRadius: "var(--radius-sm)", cursor: onClick ? "pointer" : "default",
        whiteSpace: "nowrap", ...style,
      }}
      {...rest}
    >
      {color && <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, flex: "none" }} />}
      {children}
      {removable && (
        <button type="button" aria-label="Remove tag" onClick={(e) => { e.stopPropagation(); onRemove && onRemove(); }}
          style={{ display: "inline-flex", border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-tertiary)", padding: 0, marginRight: -2 }}>
          <i data-lucide="x" style={{ width: 13, height: 13 }} />
        </button>
      )}
    </span>
  );
}