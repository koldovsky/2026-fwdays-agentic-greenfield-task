import React from "react";

/**
 * A single time-entry row: description, tag, elapsed duration, and a
 * quick "continue" affordance. When `running`, the row glows amber and
 * shows a live, pulsing dot.
 */
export function TimerEntry({
  description,
  tag,
  tagColor = "amber",
  duration,
  running = false,
  onContinue,
  style = {},
  ...rest
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 14px",
        background: running ? "color-mix(in srgb, var(--accent) 8%, var(--surface))" : "var(--surface)",
        border: `1px solid ${running ? "var(--accent-soft)" : "var(--border)"}`,
        borderRadius: "var(--radius-md)",
        boxShadow: running ? "var(--shadow-glow)" : "var(--shadow-1)",
        transition: "background var(--dur-base), box-shadow var(--dur-base)",
        ...style,
      }}
      {...rest}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
        <span style={{
          fontFamily: "var(--font-text)",
          fontSize: "var(--text-callout)",
          fontWeight: "var(--weight-semibold)",
          color: "var(--text)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>{description}</span>
        {tag && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: tagColor, flex: "none" }} />
            <span style={{ fontSize: "var(--text-footnote)", color: "var(--text-muted)" }}>{tag}</span>
          </span>
        )}
      </span>

      <span style={{
        fontFamily: "var(--font-numeric)",
        fontVariantNumeric: "tabular-nums",
        fontWeight: "var(--weight-bold)",
        fontSize: 19,
        letterSpacing: "var(--tracking-tight)",
        color: running ? "var(--accent)" : "var(--text)",
      }}>{duration}</span>

      <button
        onClick={onContinue}
        aria-label={running ? "Stop timer" : "Continue this entry"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          flex: "none",
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background: running ? "var(--accent)" : "var(--fill-soft)",
          color: running ? "var(--on-accent)" : "var(--accent)",
          transition: "transform var(--dur-fast) var(--ease-settle)",
          WebkitTapHighlightColor: "transparent",
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.9)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        {running ? (
          <span style={{ width: 13, height: 13, borderRadius: 3, background: "currentColor" }} />
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>
    </div>
  );
}
