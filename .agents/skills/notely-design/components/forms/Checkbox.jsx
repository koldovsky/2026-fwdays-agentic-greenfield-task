"use client";

import React from "react";

/** Notely Checkbox — supports checked, indeterminate, disabled, with optional label. */
export function Checkbox({ checked = false, indeterminate = false, label, disabled = false, onChange, id, style, ...rest }) {
  const generatedId = React.useId();
  const fieldId = id || generatedId;
  const on = checked || indeterminate;
  return (
    <label htmlFor={fieldId} style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? "var(--opacity-disabled)" : 1, ...style }}>
      <span
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 18, height: 18, flex: "none",
          background: on ? "var(--color-primary)" : "var(--color-card)",
          border: `1.5px solid ${on ? "var(--color-primary)" : "var(--color-border-strong)"}`,
          borderRadius: "var(--radius-xs)",
          color: "#fff",
          transition: "background var(--duration-fast), border-color var(--duration-fast)",
        }}
      >
        {indeterminate ? <i data-lucide="minus" style={{ width: 13, height: 13 }} /> : checked ? <i data-lucide="check" style={{ width: 13, height: 13 }} /> : null}
      </span>
      <input id={fieldId} type="checkbox" checked={checked} disabled={disabled} onChange={onChange} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} {...rest} />
      {label && <span style={{ fontSize: 14, color: "var(--color-text)" }}>{label}</span>}
    </label>
  );
}