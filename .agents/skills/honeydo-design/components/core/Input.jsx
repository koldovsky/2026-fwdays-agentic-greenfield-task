import React from "react";

/**
 * Text field with optional label and leading icon. iOS-style filled
 * surface with a soft border that warms to amber on focus.
 */
export function Input({
  label,
  leadingIcon = null,
  trailingIcon = null,
  style = {},
  containerStyle = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7, ...containerStyle }}>
      {label && (
        <span style={{
          fontFamily: "var(--font-text)",
          fontSize: "var(--text-subhead)",
          fontWeight: "var(--weight-semibold)",
          color: "var(--text-muted)",
        }}>{label}</span>
      )}
      <span style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        height: 52,
        padding: "0 16px",
        background: "var(--surface-alt)",
        border: `1px solid ${focused ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "var(--radius-md)",
        boxShadow: focused ? "0 0 0 3px var(--accent-faint)" : "none",
        transition: "border-color var(--dur-fast), box-shadow var(--dur-fast)",
      }}>
        {leadingIcon && <span style={{ color: "var(--text-muted)", display: "flex" }}>{leadingIcon}</span>}
        <input
          onFocus={(e) => { setFocused(true); rest.onFocus && rest.onFocus(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur && rest.onBlur(e); }}
          style={{
            flex: 1,
            minWidth: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "var(--font-text)",
            fontSize: "var(--text-body)",
            color: "var(--text)",
            ...style,
          }}
          {...rest}
        />
        {trailingIcon && <span style={{ color: "var(--text-muted)", display: "flex" }}>{trailingIcon}</span>}
      </span>
    </label>
  );
}
