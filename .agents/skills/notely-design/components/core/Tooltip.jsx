"use client";

import React from "react";

/** Notely Tooltip — hover/focus hint. CSS-positioned, no portal. */
export function Tooltip({ children, content, side = "top", style, ...rest }) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top: { bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)" },
    left: { right: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" },
    right: { left: "calc(100% + 6px)", top: "50%", transform: "translateY(-50%)" },
  }[side];
  return (
    <span
      style={{ position: "relative", display: "inline-flex", ...style }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)} onBlur={() => setShow(false)}
      {...rest}
    >
      {children}
      {show && (
        <span role="tooltip" style={{
          position: "absolute", ...pos, zIndex: "var(--z-tooltip)",
          background: "var(--gray-900)", color: "#fff",
          fontSize: 12, lineHeight: 1.3, fontWeight: "var(--fw-medium)",
          padding: "5px 8px", borderRadius: "var(--radius-sm)",
          boxShadow: "var(--shadow-3)", whiteSpace: "nowrap", pointerEvents: "none",
          animation: "notely-fade-in var(--duration-fast) var(--ease-standard)",
        }}>{content}</span>
      )}
    </span>
  );
}