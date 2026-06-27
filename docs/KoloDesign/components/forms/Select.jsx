import React from "react";

/** Native select styled to match Input. */
export function Select({ label, options = [], fill = "white", style = {}, ...rest }) {
  return (
    <label style={{ display: "block" }}>
      {label && (
        <span style={{ display: "block", fontSize: "var(--text-base)", color: "var(--ink-muted)", marginBottom: "5px" }}>{label}</span>
      )}
      <select
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
      >
        {options.map((o) => {
          const value = typeof o === "string" ? o : o.value;
          const label = typeof o === "string" ? o : o.label;
          return <option key={value} value={value}>{label}</option>;
        })}
      </select>
    </label>
  );
}
