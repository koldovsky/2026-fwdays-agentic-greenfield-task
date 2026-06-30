import React from "react";

/**
 * iOS segmented control. Used for the Light/Dark/System theme switch.
 * Controlled via `value` + `onChange`.
 */
export function SegmentedControl({ options = [], value, onChange, style = {}, ...rest }) {
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 2,
        padding: 3,
        background: "var(--fill-soft)",
        borderRadius: "var(--radius-sm)",
        ...style,
      }}
      {...rest}
    >
      {options.map((opt) => {
        const val = typeof opt === "string" ? opt : opt.value;
        const labelText = typeof opt === "string" ? opt : opt.label;
        const active = val === value;
        return (
          <button
            key={val}
            onClick={() => onChange && onChange(val)}
            style={{
              flex: 1,
              padding: "7px 16px",
              border: "none",
              borderRadius: "calc(var(--radius-sm) - 2px)",
              cursor: "pointer",
              fontFamily: "var(--font-text)",
              fontSize: "var(--text-subhead)",
              fontWeight: "var(--weight-semibold)",
              whiteSpace: "nowrap",
              color: active ? "var(--text)" : "var(--text-muted)",
              background: active ? "var(--surface)" : "transparent",
              boxShadow: active ? "var(--shadow-1)" : "none",
              transition: "background var(--dur-fast) var(--ease-standard), color var(--dur-fast)",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {labelText}
          </button>
        );
      })}
    </div>
  );
}
