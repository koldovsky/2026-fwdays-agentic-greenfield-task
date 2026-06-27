import React from "react";

/** Five-dot score readout. value is 0–5 (rounded to fill count). */
export function ScaleDots({ value = 0, max = 5, size = 10, gap = 7, style = {} }) {
  return (
    <div style={{ display: "flex", gap: `${gap}px`, alignItems: "center", ...style }}>
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: "var(--radius-full)",
            background: i < Math.round(value) ? "var(--ink)" : "var(--dot-empty)",
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}
