import React from "react";

/**
 * Streak display as a row of honeycomb cells. Filled cells are amber;
 * the most recent filled cell can carry a small bee. Empty cells are
 * dashed outlines.
 */
export function StreakHive({ filled = 0, total = 7, current, label, style = {}, ...rest }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, ...style }} {...rest}>
      <div style={{ display: "flex", gap: 6 }}>
        {Array.from({ length: total }).map((_, i) => {
          const isFilled = i < filled;
          const isCurrent = i === filled - 1;
          return (
            <span key={i} style={{ position: "relative", width: 34, height: 38, flex: "none" }}>
              <span style={{
                position: "absolute", inset: 0,
                clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
                background: isFilled ? "var(--accent)" : "var(--surface-alt)",
                border: isFilled ? "none" : "1px dashed var(--border)",
              }} />
              {isCurrent && current && (
                <span style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16,
                }}>🐝</span>
              )}
            </span>
          );
        })}
      </div>
      {label && (
        <span style={{ fontSize: "var(--text-footnote)", color: "var(--text-muted)" }}>{label}</span>
      )}
    </div>
  );
}
