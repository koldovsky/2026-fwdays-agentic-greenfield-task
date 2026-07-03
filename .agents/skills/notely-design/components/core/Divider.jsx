import React from "react";

/** Notely Divider — hairline separator. Horizontal or vertical, optional label. */
export function Divider({ orientation = "horizontal", label, spacing = 16, style, ...rest }) {
  if (orientation === "vertical") {
    return <span role="separator" aria-orientation="vertical" style={{ display: "inline-block", width: 1, alignSelf: "stretch", background: "var(--color-divider)", margin: `0 ${spacing}px`, ...style }} {...rest} />;
  }
  if (label) {
    return (
      <div role="separator" style={{ display: "flex", alignItems: "center", gap: 12, margin: `${spacing}px 0`, ...style }} {...rest}>
        <span style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
        <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", fontWeight: "var(--fw-medium)" }}>{label}</span>
        <span style={{ flex: 1, height: 1, background: "var(--color-divider)" }} />
      </div>
    );
  }
  return <hr role="separator" style={{ border: "none", height: 1, background: "var(--color-divider)", margin: `${spacing}px 0`, ...style }} {...rest} />;
}
