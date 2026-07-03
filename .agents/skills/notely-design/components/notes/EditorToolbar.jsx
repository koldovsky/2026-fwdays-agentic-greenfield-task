"use client";

import React from "react";

/** Notely EditorToolbar — rich-text formatting bar for the note editor. */
export function EditorToolbar({ active = {}, onAction, style, ...rest }) {
  const groups = [
    [["bold", "Bold"], ["italic", "Italic"], ["underline", "Underline"], ["strikethrough", "Strikethrough"]],
    [["heading-1", "Heading 1"], ["heading-2", "Heading 2"], ["quote", "Quote"]],
    [["list", "Bullet list"], ["list-ordered", "Numbered list"], ["list-checks", "Checklist"]],
    [["link", "Link"], ["code", "Code"], ["image", "Image"]],
  ];
  const Btn = ({ name, label }) => {
    const [hover, setHover] = React.useState(false);
    const on = active[name];
    return (
      <button type="button" aria-label={label} title={label}
        onClick={() => onAction && onAction(name)}
        onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 32, border: "none", borderRadius: "var(--radius-sm)",
          background: on ? "var(--color-selected)" : hover ? "var(--color-hover)" : "transparent",
          color: on ? "var(--color-primary)" : "var(--color-text-secondary)",
          cursor: "pointer", transition: "background var(--duration-fast)",
        }}>
        <i data-lucide={name} style={{ width: 17, height: 17 }} />
      </button>
    );
  };
  return (
    <div role="toolbar" style={{
      display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap",
      padding: 4, background: "var(--color-card)",
      border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-1)", ...style,
    }} {...rest}>
      {groups.map((g, i) => (
        <React.Fragment key={i}>
          {g.map(([name, label]) => <Btn key={name} name={name} label={label} />)}
          {i < groups.length - 1 && <span style={{ width: 1, height: 20, background: "var(--color-divider)", margin: "0 4px" }} />}
        </React.Fragment>
      ))}
    </div>
  );
}