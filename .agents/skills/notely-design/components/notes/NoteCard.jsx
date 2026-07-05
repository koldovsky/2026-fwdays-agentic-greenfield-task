"use client";

import React from "react";
import { Tag } from "../core/Tag.jsx";

/**
 * Notely NoteCard — a note preview tile (grid or list).
 * Shows title, snippet, meta, tags, and pin/favorite affordances.
 */
export function NoteCard({
  title = "Untitled",
  snippet = "",
  date,
  folder,
  tags = [],
  pinned = false,
  favorite = false,
  color,
  selected = false,
  layout = "grid",
  onClick,
  onTogglePin,
  onToggleFavorite,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const isList = layout === "list";
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        display: "flex", flexDirection: isList ? "row" : "column",
        alignItems: isList ? "center" : "stretch",
        gap: isList ? 14 : 10,
        padding: isList ? "12px 14px" : 16,
        background: selected ? "var(--color-selected)" : "var(--color-card)",
        border: `1px solid ${selected ? "var(--color-primary)" : hover ? "var(--color-border-strong)" : "var(--color-border)"}`,
        borderRadius: "var(--radius-lg)",
        boxShadow: hover ? "var(--shadow-2)" : "var(--shadow-1)",
        cursor: "pointer",
        transition: "box-shadow var(--duration-base) var(--ease-standard), border-color var(--duration-base)",
        ...style,
      }}
      {...rest}
    >
      {color && <span style={{ position: "absolute", left: 0, top: 14, bottom: 14, width: 3, borderRadius: "var(--radius-full)", background: color, display: isList ? "block" : "none" }} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          {pinned && <i data-lucide="pin" style={{ width: 14, height: 14, color: "var(--color-primary)", transform: "rotate(45deg)" }} />}
          <span style={{ fontSize: 15, fontWeight: "var(--fw-semibold)", color: "var(--color-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</span>
        </div>
        {snippet && (
          <div
            className="note-card-snippet"
            style={{
              margin: 0, fontSize: 13, color: "var(--color-text-secondary)", lineHeight: "var(--lh-normal)",
              display: "-webkit-box", WebkitLineClamp: isList ? 1 : 3, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}
            // `snippet` is pre-sanitized HTML (rendered from Markdown via
            // lib/markdown/snippet.ts) — never raw user content.
            dangerouslySetInnerHTML={{ __html: snippet }}
          />
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: isList ? 4 : 12, flexWrap: "wrap" }}>
          {date && <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>{date}</span>}
          {folder && <span style={{ fontSize: 12, color: "var(--color-text-tertiary)", display: "inline-flex", alignItems: "center", gap: 4 }}><i data-lucide="folder" style={{ width: 12, height: 12 }} />{folder}</span>}
          {tags.slice(0, isList ? 2 : 3).map((t) => <Tag key={t.label || t} color={t.color}>{t.label || t}</Tag>)}
        </div>
      </div>
      <div style={{ display: "flex", gap: 2, opacity: hover || favorite || pinned ? 1 : 0, transition: "opacity var(--duration-fast)", alignSelf: isList ? "center" : "flex-start", position: isList ? "static" : "absolute", top: 12, right: 12 }}>
        <button type="button" aria-label="Favorite" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onToggleFavorite) onToggleFavorite(); }}
          style={{ border: "none", background: "transparent", cursor: "pointer", color: favorite ? "var(--color-warning)" : "var(--color-text-tertiary)", padding: 4, display: "inline-flex" }}>
          <i data-lucide="star" style={{ width: 16, height: 16, fill: favorite ? "var(--color-warning)" : "none" }} />
        </button>
        <button type="button" aria-label="Pin" onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (onTogglePin) onTogglePin(); }}
          style={{ border: "none", background: "transparent", cursor: "pointer", color: pinned ? "var(--color-primary)" : "var(--color-text-tertiary)", padding: 4, display: "inline-flex" }}>
          <i data-lucide="pin" style={{ width: 16, height: 16, fill: pinned ? "var(--color-primary)" : "none" }} />
        </button>
      </div>
    </div>
  );
}