"use client";

import React from "react";

/** Notely SearchField — search input with icon, clear button, optional ⌘K hint. */
export function SearchField({
  value = "",
  placeholder = "Search notes",
  size = "md",
  shortcut,
  onChange,
  onClear,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const sizes = { sm: 32, md: 38, lg: 44 };
  const h = sizes[size] || sizes.md;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: h,
        padding: "0 10px",
        background: "var(--color-card)",
        border: `1px solid ${focus ? "var(--color-primary)" : "var(--color-border-strong)"}`,
        borderRadius: "var(--radius-md)",
        boxShadow: focus ? "var(--shadow-focus)" : "none",
        transition: "border-color var(--duration-fast), box-shadow var(--duration-fast)",
        color: "var(--color-text-tertiary)",
        ...style,
      }}
    >
      <i data-lucide="search" style={{ width: 16, height: 16 }} />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent",
          fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--color-text)",
        }}
        {...rest}
      />
      {value ? (
        <button
          type="button" aria-label="Clear search" onClick={onClear}
          style={{ display: "inline-flex", border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-tertiary)", padding: 2 }}
        >
          <i data-lucide="x" style={{ width: 15, height: 15 }} />
        </button>
      ) : shortcut ? (
        <kbd style={{
          fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-text-tertiary)",
          background: "var(--color-bg)", border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-sm)", padding: "1px 5px",
        }}>{shortcut}</kbd>
      ) : null}
    </div>
  );
}