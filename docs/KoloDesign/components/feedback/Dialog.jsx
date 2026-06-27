import React from "react";

/**
 * Centered modal dialog. Scrim + white card with hairline border and the
 * dialog shadow. Title, body, then right-aligned actions.
 */
export function Dialog({ title, children, actions, onClose, open = true }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 900,
        background: "rgba(26,26,24,.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius-md)",
          padding: "28px 32px",
          maxWidth: "440px", width: "100%",
          boxShadow: "var(--shadow-dialog)",
        }}
      >
        {title && <div style={{ fontSize: "var(--text-md)", fontWeight: "var(--weight-medium)", marginBottom: "8px" }}>{title}</div>}
        <div style={{ color: "var(--ink-muted)", lineHeight: "var(--leading-normal)", marginBottom: "24px" }}>{children}</div>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>{actions}</div>
      </div>
    </div>
  );
}
