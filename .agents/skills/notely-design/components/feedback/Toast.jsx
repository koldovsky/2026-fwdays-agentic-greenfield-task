"use client";

import React from "react";

/** Notely Toast — transient confirmation. Render inside a fixed container. */
export function Toast({ message, tone = "neutral", action, actionLabel, onAction, onDismiss, style, ...rest }) {
  const icons = { neutral: "info", success: "check-circle", warning: "alert-triangle", danger: "alert-circle" };
  const colors = {
    neutral: "var(--color-text-secondary)",
    success: "var(--color-success)",
    warning: "var(--color-warning)",
    danger: "var(--color-danger)",
  };
  return (
    <div role="status" style={{
      display: "flex", alignItems: "center", gap: 10,
      minWidth: 260, maxWidth: 400, padding: "10px 12px",
      background: "var(--gray-900)", color: "#fff",
      borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-4)",
      fontSize: 14, animation: "notely-fade-rise var(--duration-base) var(--ease-standard)", ...style,
    }} {...rest}>
      <i data-lucide={icons[tone]} style={{ width: 18, height: 18, color: tone === "neutral" ? "#fff" : colors[tone], flex: "none" }} />
      <span style={{ flex: 1 }}>{message}</span>
      {actionLabel && (
        <button type="button" onClick={onAction} style={{ border: "none", background: "transparent", color: "var(--indigo-300)", fontWeight: "var(--fw-semibold)", fontSize: 14, cursor: "pointer", padding: "2px 4px" }}>{actionLabel}</button>
      )}
      {onDismiss && (
        <button type="button" aria-label="Dismiss" onClick={onDismiss} style={{ border: "none", background: "transparent", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: 2, display: "inline-flex" }}>
          <i data-lucide="x" style={{ width: 15, height: 15 }} />
        </button>
      )}
    </div>
  );
}