"use client";

import React from "react";

/** Notely FolderItem — sidebar folder row with count and selected state. */
export function FolderItem({ name, count, color, icon = "folder", active = false, depth = 0, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%",
        padding: "7px 10px", paddingLeft: 10 + depth * 16,
        border: "none", borderRadius: "var(--radius-md)",
        background: active ? "var(--color-selected)" : hover ? "var(--color-hover)" : "transparent",
        color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
        cursor: "pointer", textAlign: "left", fontFamily: "var(--font-sans)",
        transition: "background var(--duration-fast)", ...style,
      }}
      {...rest}
    >
      {color
        ? <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, flex: "none" }} />
        : <i data-lucide={icon} style={{ width: 16, height: 16, flex: "none" }} />}
      <span style={{ flex: 1, fontSize: 14, fontWeight: active ? "var(--fw-semibold)" : "var(--fw-medium)", color: active ? "var(--color-text)" : "inherit", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
      {count != null && <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{count}</span>}
    </button>
  );
}