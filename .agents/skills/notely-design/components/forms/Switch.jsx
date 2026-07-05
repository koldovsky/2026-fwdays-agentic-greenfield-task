"use client";

import React from "react";

/** Notely Switch — on/off toggle (pill). */
export function Switch({ checked = false, label, disabled = false, onChange, id, style, ...rest }) {
  const generatedId = React.useId();
  const fieldId = id || generatedId;
  return (
    <label htmlFor={fieldId} style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? "var(--opacity-disabled)" : 1, ...style }}>
      <span
        role="switch" aria-checked={checked}
        style={{
          position: "relative", width: 38, height: 22, flex: "none",
          background: checked ? "var(--color-primary)" : "var(--color-border-strong)",
          borderRadius: "var(--radius-full)",
          transition: "background var(--duration-base) var(--ease-standard)",
        }}
      >
        <span style={{
          position: "absolute", top: 2, left: checked ? 18 : 2,
          width: 18, height: 18, background: "#fff", borderRadius: "50%",
          boxShadow: "var(--shadow-1)",
          transition: "left var(--duration-base) var(--ease-standard)",
        }} />
      </span>
      <input id={fieldId} type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={onChange} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} {...rest} />
      {label && <span style={{ fontSize: 14, color: "var(--color-text)" }}>{label}</span>}
    </label>
  );
}