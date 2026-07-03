"use client";

import React from "react";

/** Notely Radio — single selection within a group. */
export function Radio({ checked = false, label, name, value, disabled = false, onChange, id, style, ...rest }) {
  const generatedId = React.useId();
  const fieldId = id || generatedId;
  return (
    <label htmlFor={fieldId} style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? "var(--opacity-disabled)" : 1, ...style }}>
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 18, height: 18, flex: "none", borderRadius: "50%",
        background: "var(--color-card)",
        border: `1.5px solid ${checked ? "var(--color-primary)" : "var(--color-border-strong)"}`,
        transition: "border-color var(--duration-fast)",
      }}>
        {checked && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--color-primary)" }} />}
      </span>
      <input id={fieldId} type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={onChange} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} {...rest} />
      {label && <span style={{ fontSize: 14, color: "var(--color-text)" }}>{label}</span>}
    </label>
  );
}