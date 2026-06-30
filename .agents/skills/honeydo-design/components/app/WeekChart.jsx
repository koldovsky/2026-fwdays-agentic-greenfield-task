import React from "react";

/**
 * Weekly bar chart — hours per day for the last 7 days. Bars grow from
 * the baseline with a staggered settle; the tallest (or `goal`-meeting)
 * bars read amber. Goal line is a dashed hairline.
 */
export function WeekChart({ data = [], goal, height = 150, style = {}, ...rest }) {
  const max = Math.max(goal || 0, ...data.map((d) => d.hours), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }} {...rest}>
      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 8, height }}>
        {goal != null && (
          <div style={{
            position: "absolute",
            left: 0, right: 0,
            bottom: `${(goal / max) * 100}%`,
            borderTop: "1px dashed var(--border)",
            pointerEvents: "none",
          }} />
        )}
        {data.map((d, i) => {
          const pct = Math.max((d.hours / max) * 100, 2);
          const met = goal != null && d.hours >= goal;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
              <span style={{ fontSize: 11, fontWeight: "var(--weight-bold)", color: "var(--text-muted)", fontFamily: "var(--font-numeric)" }}>
                {d.hours > 0 ? d.hours : ""}
              </span>
              <div style={{
                width: "100%",
                maxWidth: 28,
                height: `${pct}%`,
                borderRadius: "var(--radius-xs)",
                background: met ? "var(--accent)" : d.today ? "var(--highlight-gold)" : "var(--surface-alt)",
                border: d.today ? "none" : "1px solid var(--border)",
                transition: "height var(--dur-slow) var(--ease-settle)",
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {data.map((d, i) => (
          <span key={i} style={{ flex: 1, textAlign: "center", fontSize: 11, color: d.today ? "var(--accent)" : "var(--text-muted)", fontWeight: d.today ? "var(--weight-bold)" : "var(--weight-medium)" }}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
