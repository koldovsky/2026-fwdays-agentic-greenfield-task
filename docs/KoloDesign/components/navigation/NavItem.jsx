import React from "react";

/** Sidebar navigation item. Active = green tint fill + green text + medium. */
export function NavItem({ children, icon, active = false, onClick, style = {} }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "8px", width: "100%",
        padding: "8px 12px",
        borderRadius: "var(--radius-sm)",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        fontFamily: "var(--font-ui)",
        fontSize: "var(--text-body)",
        background: active ? "var(--green-tint-3)" : "transparent",
        color: active ? "var(--green)" : "var(--ink-muted)",
        fontWeight: active ? "var(--weight-medium)" : "var(--weight-regular)",
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}
