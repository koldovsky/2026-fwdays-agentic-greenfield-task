import React from "react";

/** Multiline text input matching Input's styling. */
export function Textarea({ label, hint, fill = "white", rows = 4, style = {}, ...rest }) {
  return (
    <label style={{ display: "block" }}>
      {label && (
        <span style={{ display: "block", fontSize: "var(--text-base)", color: "var(--ink-muted)", marginBottom: "5px" }}>
          {label}{hint && <span style={{ color: "var(--ink-muted)", fontSize: "var(--text-xs)", marginLeft: 5 }}>{hint}</span>}
        </span>
      )}
      <textarea
        rows={rows}
        style={{
          width: "100%",
          padding: "12px",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius-md)",
          background: fill === "paper" ? "var(--paper)" : "var(--surface)",
          color: "var(--ink)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--text-body)",
          lineHeight: "var(--leading-snug)",
          resize: "vertical",
          ...style,
        }}
        {...rest}
      />
    </label>
  );
}
