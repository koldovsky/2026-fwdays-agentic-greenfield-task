import React from "react";

/** Transient dark pill, bottom-right. Render only when a message is present. */
export function Toast({ message, style = {} }) {
  if (!message) return null;
  return (
    <div
      style={{
        position: "fixed", bottom: "24px", right: "24px", zIndex: 3000,
        background: "var(--ink)", color: "var(--paper)",
        padding: "10px 16px",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--text-base)",
        fontFamily: "var(--font-ui)",
        boxShadow: "var(--shadow-toast)",
        pointerEvents: "none",
        ...style,
      }}
    >
      {message}
    </div>
  );
}
