import React from "react";

/**
 * iOS bottom tab bar. Active tab reads amber. Pass items with an icon
 * node and label; control with `value` + `onChange`.
 */
export function TabBar({ items = [], value, onChange, style = {}, ...rest }) {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-around",
        paddingTop: 8,
        height: "var(--tabbar-height)",
        background: "color-mix(in srgb, var(--surface) 88%, transparent)",
        backdropFilter: "saturate(160%) blur(20px)",
        WebkitBackdropFilter: "saturate(160%) blur(20px)",
        borderTop: "1px solid var(--border)",
        ...style,
      }}
      {...rest}
    >
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            onClick={() => onChange && onChange(it.value)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              flex: 1,
              padding: "4px 0",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: active ? "var(--accent)" : "var(--text-muted)",
              transition: "color var(--dur-fast)",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span style={{ display: "flex", transition: "transform var(--dur-fast) var(--ease-settle)", transform: active ? "scale(1.06)" : "scale(1)" }}>
              {it.icon}
            </span>
            <span style={{
              fontFamily: "var(--font-text)",
              fontSize: 11,
              fontWeight: active ? "var(--weight-bold)" : "var(--weight-medium)",
            }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
