import React from "react";

/** Text input — hairline border, 8px radius, paper or white fill. */
export function Input({ label, hint, fill = "white", style = {}, ...rest }) {
  return (
    <label style={{ display: "block" }}>
      {label && (
        <span style={{ display: "block", fontSize: "var(--text-base)", color: "var(--ink-muted)", marginBottom: "5px" }}>
          {label}{hint && <span style={{ color: "var(--line-strong)", fontSize: "var(--text-xs)", marginLeft: 5 }}>{hint}</span>}
        </span>
      )}
      <input
        style={{
          width: "100%",
          padding: "8px 10px",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius-md)",
          background: fill === "paper" ? "var(--paper)" : "var(--surface)",
          color: "var(--ink)",
          fontFamily: "var(--font-ui)",
          fontSize: "var(--text-body)",
          ...style,
        }}
        {...rest}
      />
    </label>
  );
}
