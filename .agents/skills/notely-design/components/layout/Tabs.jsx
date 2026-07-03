"use client";

import React from "react";

/** Notely Tabs — underline tab bar. Controlled via value/onChange. */
export function Tabs({ tabs = [], value, onChange, style, ...rest }) {
  return (
    <div role="tablist" style={{ display: "flex", gap: 4, borderBottom: "1px solid var(--color-divider)", ...style }} {...rest}>
      {tabs.map((t) => {
        const tab = typeof t === "string" ? { value: t, label: t } : t;
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange && onChange(tab.value)}
            style={{
              position: "relative",
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 12px",
              border: "none", background: "transparent", cursor: "pointer",
              fontFamily: "var(--font-sans)", fontSize: 14,
              fontWeight: active ? "var(--fw-semibold)" : "var(--fw-medium)",
              color: active ? "var(--color-text)" : "var(--color-text-secondary)",
              transition: "color var(--duration-fast)",
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.count != null && <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{tab.count}</span>}
            <span style={{
              position: "absolute", left: 8, right: 8, bottom: -1, height: 2,
              borderRadius: "var(--radius-full)",
              background: active ? "var(--color-primary)" : "transparent",
              transition: "background var(--duration-fast)",
            }} />
          </button>
        );
      })}
    </div>
  );
}