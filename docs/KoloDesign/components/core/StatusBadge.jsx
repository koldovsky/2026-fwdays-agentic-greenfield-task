import React from "react";

const MAP = {
  done:       { label: "done",       bg: "var(--green-tint-4)", color: "var(--green-ink)" },
  approved:   { label: "approved",   bg: "var(--green-tint-4)", color: "var(--green-ink)" },
  responded:  { label: "responded",  bg: "var(--green-tint-4)", color: "var(--green-ink)" },
  collecting: { label: "collecting", bg: "var(--warn-fill)",    color: "var(--warn-ink)" },
  declined:   { label: "declined",   bg: "var(--danger-fill)",  color: "var(--danger-ink)" },
  draft:      { label: "draft",      bg: "var(--neutral-fill)", color: "var(--ink-muted)" },
  sent:       { label: "sent",       bg: "var(--neutral-fill)", color: "var(--ink-muted)" },
  pending:    { label: "draft",      bg: "var(--neutral-fill)", color: "var(--ink-muted)" },
};

/** Low-chroma status pill. Maps a known status to its fill + ink. */
export function StatusBadge({ status = "draft", label, style = {} }) {
  const c = MAP[status] || MAP.draft;
  return (
    <span
      style={{
        background: c.bg,
        color: c.color,
        padding: "2px 8px",
        borderRadius: "var(--radius-sm)",
        fontSize: "var(--text-sm)",
        fontWeight: "var(--weight-medium)",
        fontFamily: "var(--font-ui)",
        display: "inline-block",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {label || c.label}
    </span>
  );
}
