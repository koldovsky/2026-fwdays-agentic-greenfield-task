"use client";

import React from "react";

/** Notely Modal — centered dialog with backdrop. Esc + backdrop click to close. */
export function Modal({ open, title, children, footer, size = "md", onClose }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const widths = { sm: 380, md: 480, lg: 640 };
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: "var(--z-modal)",
        background: "var(--color-overlay)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, backdropFilter: "blur(2px)",
        animation: "notely-fade-in var(--duration-fast) var(--ease-standard)",
      }}
    >
      <div
        role="dialog" aria-modal="true" aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: widths[size] || widths.md,
          background: "var(--color-card)", borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-4)", overflow: "hidden",
          animation: "notely-scale-in var(--duration-base) var(--ease-standard)",
        }}
      >
        {title && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--color-divider)" }}>
            <span style={{ fontSize: 16, fontWeight: "var(--fw-semibold)", color: "var(--color-text)" }}>{title}</span>
            <button type="button" aria-label="Close" onClick={onClose} style={{ display: "inline-flex", border: "none", background: "transparent", cursor: "pointer", color: "var(--color-text-tertiary)", padding: 4 }}>
              <i data-lucide="x" style={{ width: 18, height: 18 }} />
            </button>
          </div>
        )}
        <div style={{ padding: 20, fontSize: 14, color: "var(--color-text-secondary)", lineHeight: "var(--lh-normal)" }}>{children}</div>
        {footer && <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 20px", borderTop: "1px solid var(--color-divider)" }}>{footer}</div>}
      </div>
    </div>
  );
}