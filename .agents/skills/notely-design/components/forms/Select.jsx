"use client";

import React from "react";

/** Notely Select — styled native-backed dropdown. */
export function Select({ label, value, options = [], placeholder = "Select…", size = "md", disabled = false, onChange, id, style, ...rest }) {
  const generatedId = React.useId();
  const fieldId = id || generatedId;
  const [focus, setFocus] = React.useState(false);
  const sizes = { sm: 32, md: 38, lg: 44 };
  const h = sizes[size] || sizes.md;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && <label htmlFor={fieldId} style={{ fontSize: 13, fontWeight: "var(--fw-medium)", color: "var(--color-text)" }}>{label}</label>}
      <div style={{
        position: "relative", display: "flex", alignItems: "center", height: h,
        background: "var(--color-card)",
        border: `1px solid ${focus ? "var(--color-primary)" : "var(--color-border-strong)"}`,
        borderRadius: "var(--radius-md)",
        boxShadow: focus ? "var(--shadow-focus)" : "none",
        opacity: disabled ? "var(--opacity-disabled)" : 1,
      }}>
        <select
          id={fieldId} value={value} disabled={disabled} onChange={onChange}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            appearance: "none", WebkitAppearance: "none", flex: 1, height: "100%",
            border: "none", outline: "none", background: "transparent",
            padding: "0 34px 0 12px", fontFamily: "var(--font-sans)", fontSize: 14,
            color: value ? "var(--color-text)" : "var(--color-text-tertiary)", cursor: "pointer",
          }}
          {...rest}
        >
          {placeholder && <option value="" disabled hidden>{placeholder}</option>}
          {options.map((o) => {
            const opt = typeof o === "string" ? { value: o, label: o } : o;
            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
          })}
        </select>
        <i data-lucide="chevron-down" style={{ position: "absolute", right: 10, width: 16, height: 16, pointerEvents: "none", color: "var(--color-text-tertiary)" }} />
      </div>
    </div>
  );
}