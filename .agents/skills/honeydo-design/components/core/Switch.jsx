import React from "react";

/**
 * iOS-style toggle switch. Track turns amber when on. Controlled via
 * `checked` + `onChange`.
 */
export function Switch({ checked = false, onChange, disabled = false, size = "md", style = {}, ...rest }) {
  const dims = size === "sm" ? { w: 44, h: 26, knob: 22 } : { w: 51, h: 31, knob: 27 };
  const pad = (dims.h - dims.knob) / 2;
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      style={{
        position: "relative",
        width: dims.w,
        height: dims.h,
        borderRadius: "var(--radius-pill)",
        border: "none",
        padding: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        background: checked ? "var(--accent)" : "var(--fill-soft)",
        transition: "background var(--dur-base) var(--ease-standard)",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
      {...rest}
    >
      <span
        style={{
          position: "absolute",
          top: pad,
          left: checked ? dims.w - dims.knob - pad : pad,
          width: dims.knob,
          height: dims.knob,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 2px 5px rgba(42,27,5,0.28)",
          transition: "left var(--dur-base) var(--ease-settle)",
        }}
      />
    </button>
  );
}
