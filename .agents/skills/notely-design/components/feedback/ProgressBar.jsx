import React from "react";

/** Notely ProgressBar — determinate or indeterminate. */
export function ProgressBar({ value = 0, indeterminate = false, tone = "primary", height = 6, style, ...rest }) {
  const color = { primary: "var(--color-primary)", success: "var(--color-success)", warning: "var(--color-warning)", danger: "var(--color-danger)" }[tone];
  return (
    <div role="progressbar" aria-valuenow={indeterminate ? undefined : value} aria-valuemin={0} aria-valuemax={100}
      style={{ width: "100%", height, background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-full)", overflow: "hidden", ...style }} {...rest}>
      <div style={{
        height: "100%", background: color, borderRadius: "var(--radius-full)",
        width: indeterminate ? "40%" : `${Math.max(0, Math.min(100, value))}%`,
        transition: "width var(--duration-slow) var(--ease-standard)",
        animation: indeterminate ? "notely-indeterminate 1.2s var(--ease-standard) infinite" : "none",
      }} />
    </div>
  );
}
