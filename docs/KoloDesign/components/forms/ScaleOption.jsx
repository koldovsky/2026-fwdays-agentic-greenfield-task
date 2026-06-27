import React from "react";

/**
 * A full-width selectable scale answer — mono value + anchor label.
 * Selected = 2px green border + green tint.
 */
export function ScaleOption({ value, label, selected = false, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "10px", width: "100%",
        textAlign: "left",
        padding: "11px 14px",
        borderRadius: "var(--radius-md)",
        border: selected ? "2px solid var(--green)" : "1px solid var(--line-strong)",
        background: selected ? "var(--green-tint-2)" : "var(--surface)",
        cursor: "pointer",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-body)",
        lineHeight: "var(--leading-snug)",
        transition: "border-color var(--motion-fast) var(--ease), background var(--motion-fast) var(--ease)",
        ...style,
      }}
    >
      <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--line-strong)", minWidth: "18px", textAlign: "center", flexShrink: 0 }}>{value}</span>
      <span style={{ color: "var(--ink)" }}>{label}</span>
    </button>
  );
}
