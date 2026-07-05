import React from "react";

/** Notely Badge — small status/count label. */
export function Badge({ children, tone = "neutral", variant = "soft", dot = false, style, ...rest }) {
  const tones = {
    neutral: { soft: ["var(--color-bg)", "var(--color-text-secondary)"], solid: ["var(--gray-700)", "#fff"] },
    primary: { soft: ["var(--color-primary-subtle)", "var(--color-primary)"], solid: ["var(--color-primary)", "#fff"] },
    success: { soft: ["var(--color-success-subtle)", "var(--color-success)"], solid: ["var(--color-success)", "#fff"] },
    warning: { soft: ["var(--color-warning-subtle)", "var(--color-warning)"], solid: ["var(--color-warning)", "#fff"] },
    danger: { soft: ["var(--color-danger-subtle)", "var(--color-danger)"], solid: ["var(--color-danger)", "#fff"] },
    info: { soft: ["var(--color-info-subtle)", "var(--color-info)"], solid: ["var(--color-info)", "#fff"] },
  };
  const [bg, fg] = (tones[tone] || tones.neutral)[variant];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      height: 20, padding: "0 8px", background: bg, color: fg,
      fontSize: 12, fontWeight: "var(--fw-medium)", lineHeight: 1,
      borderRadius: "var(--radius-full)", whiteSpace: "nowrap", ...style,
    }} {...rest}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />}
      {children}
    </span>
  );
}
