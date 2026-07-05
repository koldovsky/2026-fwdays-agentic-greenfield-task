"use client";

import React from "react";

/** Notely ChecklistItem — a to-do row inside a note. */
export function ChecklistItem({ checked = false, text, onToggle, onChange, editable = false, style, ...rest }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "3px 0", ...style }} {...rest}>
      <button
        type="button" role="checkbox" aria-checked={checked} onClick={onToggle}
        style={{
          marginTop: 2, flex: "none",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 18, height: 18, borderRadius: "var(--radius-xs)",
          background: checked ? "var(--color-primary)" : "var(--color-card)",
          border: `1.5px solid ${checked ? "var(--color-primary)" : "var(--color-border-strong)"}`,
          color: "#fff", cursor: "pointer", transition: "background var(--duration-fast)",
        }}>
        {checked && <i data-lucide="check" style={{ width: 13, height: 13 }} />}
      </button>
      {editable ? (
        <input value={text} onChange={onChange} style={{
          flex: 1, border: "none", outline: "none", background: "transparent",
          fontFamily: "var(--font-sans)", fontSize: 15,
          color: checked ? "var(--color-text-tertiary)" : "var(--color-text)",
          textDecoration: checked ? "line-through" : "none",
        }} />
      ) : (
        <span style={{
          flex: 1, fontSize: 15, lineHeight: "var(--lh-normal)",
          color: checked ? "var(--color-text-tertiary)" : "var(--color-text)",
          textDecoration: checked ? "line-through" : "none",
        }}>{text}</span>
      )}
    </div>
  );
}