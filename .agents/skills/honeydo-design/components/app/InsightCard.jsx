import React from "react";

/**
 * AI "daily insight" card — one short, warm sentence about today's pace.
 * Honey-tinted surface with a small jar/spark mark.
 */
export function InsightCard({ children, title = "Daily insight", style = {}, ...rest }) {
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        padding: 16,
        borderRadius: "var(--radius-md)",
        background: "linear-gradient(135deg, var(--accent-faint), color-mix(in srgb, var(--highlight-gold) 14%, var(--surface)))",
        border: "1px solid var(--accent-soft)",
        ...style,
      }}
      {...rest}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 24, height: 24, borderRadius: "50%",
          background: "var(--accent)", color: "var(--on-accent)",
        }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2l1.6 4.6L18 8l-4.4 1.4L12 14l-1.6-4.6L6 8l4.4-1.4z"/><circle cx="18.5" cy="16.5" r="2"/></svg>
        </span>
        <span style={{
          fontFamily: "var(--font-rounded)",
          fontSize: "var(--text-subhead)",
          fontWeight: "var(--weight-bold)",
          color: "var(--text)",
          letterSpacing: "var(--tracking-wide)",
        }}>{title}</span>
      </div>
      <p style={{
        margin: 0,
        fontFamily: "var(--font-text)",
        fontSize: "var(--text-callout)",
        lineHeight: "var(--leading-relaxed)",
        color: "var(--text)",
      }}>{children}</p>
    </div>
  );
}
