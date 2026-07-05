import React from "react";

/** Notely EmptyState — friendly placeholder for empty views. */
export function EmptyState({ icon = "inbox", title, description, action, style, ...rest }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
      padding: "48px 24px", maxWidth: 360, margin: "0 auto", ...style,
    }} {...rest}>
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 56, height: 56, borderRadius: "var(--radius-xl)",
        background: "var(--color-primary-subtle)", color: "var(--color-primary)", marginBottom: 16,
      }}>
        <i data-lucide={icon} style={{ width: 28, height: 28 }} />
      </span>
      {title && <div style={{ fontSize: 16, fontWeight: "var(--fw-semibold)", color: "var(--color-text)" }}>{title}</div>}
      {description && <div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginTop: 6, lineHeight: "var(--lh-normal)" }}>{description}</div>}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}
