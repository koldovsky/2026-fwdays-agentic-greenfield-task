"use client";

import React from "react";

/** Notely Alert — inline contextual message banner. */
export function Alert({ tone = "info", title, children, onClose, style, ...rest }) {
  const map = {
    info: { c: "var(--color-info)", bg: "var(--color-info-subtle)", i: "info" },
    success: { c: "var(--color-success)", bg: "var(--color-success-subtle)", i: "check-circle" },
    warning: { c: "var(--color-warning)", bg: "var(--color-warning-subtle)", i: "alert-triangle" },
    danger: { c: "var(--color-danger)", bg: "var(--color-danger-subtle)", i: "alert-circle" },
  };
  const t = map[tone] || map.info;
  return (
    <div role="alert" style={{
      display: "flex", gap: 10, padding: "12px 14px",
      background: t.bg, border: `1px solid ${t.c}`, borderRadius: "var(--radius-md)", ...style,
    }} {...rest}>
      <i data-lucide={t.i} style={{ width: 18, height: 18, color: t.c, flex: "none", marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontSize: 14, fontWeight: "var(--fw-semibold)", color: "var(--color-text)" }}>{title}</div>}
        {children && <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: title ? 2 : 0 }}>{children}</div>}
      </div>
      {onClose && (
        <button type="button" aria-label="Dismiss" onClick={onClose} style={{ border: "none", background: "transparent", color: "var(--color-text-tertiary)", cursor: "pointer", padding: 2, display: "inline-flex" }}>
          <i data-lucide="x" style={{ width: 15, height: 15 }} />
        </button>
      )}
    </div>
  );
}