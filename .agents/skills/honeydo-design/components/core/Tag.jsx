import React from "react";

/** Tag color presets — warm, honey-adjacent hues. */
export const TAG_COLORS = {
  amber:  "#F5A300",
  gold:   "#FFC75A",
  green:  "#7BC57F",
  clay:   "#E07A5F",
  plum:   "#9B6A9E",
  teal:   "#4FA39A",
  blue:   "#5B8DEF",
  brown:  "#A87C4F",
};

/**
 * A small labelled tag with a leading color dot. Used to categorize
 * time entries (e.g. "Design", "Admin").
 */
export function Tag({ children, color = "amber", size = "md", style = {}, ...rest }) {
  const dot = TAG_COLORS[color] || color;
  const sizes = {
    sm: { fontSize: 12, padding: "3px 9px 3px 7px", dot: 6, gap: 6 },
    md: { fontSize: 13, padding: "5px 11px 5px 9px", dot: 8, gap: 7 },
  };
  const s = sizes[size] || sizes.md;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: s.gap,
        padding: s.padding,
        fontFamily: "var(--font-text)",
        fontSize: s.fontSize,
        fontWeight: "var(--weight-semibold)",
        color: "var(--text)",
        background: "var(--fill-soft)",
        borderRadius: "var(--radius-pill)",
        ...style,
      }}
      {...rest}
    >
      <span style={{ width: s.dot, height: s.dot, borderRadius: "50%", background: dot, flex: "none" }} />
      {children}
    </span>
  );
}
