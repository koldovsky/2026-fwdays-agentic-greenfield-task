"use client";

import React from "react";

/**
 * Notely Input — single-line text field.
 * Supports label, helper/error text, leading/trailing adornments, sizes.
 */
export function Input({
  label,
  value,
  placeholder,
  type = "text",
  size = "md",
  helperText,
  error,
  leadingIcon,
  trailingIcon,
  disabled = false,
  id,
  onChange,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const sizes = { sm: { h: 32, fs: 13, px: 10 }, md: { h: 38, fs: 14, px: 12 }, lg: { h: 44, fs: 15, px: 14 } };
  const s = sizes[size] || sizes.md;
  const generatedId = React.useId();
  const fieldId = id || generatedId;
  const invalid = Boolean(error);

  const borderColor = invalid
    ? "var(--color-danger)"
    : focus
    ? "var(--color-primary)"
    : "var(--color-border-strong)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label htmlFor={fieldId} style={{ fontSize: 13, fontWeight: "var(--fw-medium)", color: "var(--color-text)" }}>
          {label}
        </label>
      )}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: s.h,
          padding: `0 ${s.px}px`,
          background: disabled ? "var(--color-bg)" : "var(--color-card)",
          border: `1px solid ${borderColor}`,
          borderRadius: "var(--radius-md)",
          boxShadow: focus && !invalid ? "var(--shadow-focus)" : "none",
          transition: "border-color var(--duration-fast), box-shadow var(--duration-fast)",
          opacity: disabled ? "var(--opacity-disabled)" : 1,
          color: "var(--color-text-tertiary)",
        }}
      >
        {leadingIcon}
        <input
          id={fieldId}
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={onChange}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          aria-invalid={invalid}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "var(--font-sans)",
            fontSize: s.fs,
            color: "var(--color-text)",
          }}
          {...rest}
        />
        {trailingIcon}
      </div>
      {(helperText || error) && (
        <span style={{ fontSize: 12, color: invalid ? "var(--color-danger)" : "var(--color-text-secondary)" }}>
          {error || helperText}
        </span>
      )}
    </div>
  );
}