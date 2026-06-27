import React from "react";

/** Compact toggle switch (34×20). Green when on. */
export function Switch({ checked = false, onChange, style = {} }) {
  return (
    <div
      onClick={() => onChange && onChange(!checked)}
      style={{
        width: "34px",
        height: "20px",
        borderRadius: "var(--radius-pill)",
        background: checked ? "var(--green)" : "var(--line-strong)",
        cursor: "pointer",
        position: "relative",
        transition: "background var(--motion-fast) var(--ease)",
        flexShrink: 0,
        ...style,
      }}
    >
      <div
        style={{
          width: "14px",
          height: "14px",
          borderRadius: "var(--radius-full)",
          background: "#fff",
          position: "absolute",
          top: "3px",
          left: checked ? "17px" : "3px",
          transition: "left var(--motion-fast) var(--ease)",
        }}
      />
    </div>
  );
}
