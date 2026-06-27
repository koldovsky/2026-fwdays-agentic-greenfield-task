import React from "react";

/** 4px progress/coverage bar. value 0–1. */
export function ProgressBar({ value = 0, style = {} }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div style={{ height: "4px", background: "var(--line)", borderRadius: "2px", ...style }}>
      <div
        style={{
          width: `${pct}%`,
          height: "4px",
          background: "var(--green)",
          borderRadius: "2px",
          transition: "width var(--motion-mid) var(--ease)",
        }}
      />
    </div>
  );
}
