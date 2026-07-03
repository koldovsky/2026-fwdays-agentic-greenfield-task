import React from "react";

/** Notely Avatar — user image with initials fallback and optional status dot. */
export function Avatar({ src, name = "", size = "md", status, style, ...rest }) {
  const sizes = { xs: 22, sm: 28, md: 34, lg: 44, xl: 64 };
  const px = sizes[size] || sizes.md;
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  // deterministic hue from name
  let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  const statusColors = { online: "var(--color-success)", away: "var(--color-warning)", offline: "var(--color-text-tertiary)" };
  return (
    <span style={{ position: "relative", display: "inline-flex", width: px, height: px, flex: "none", ...style }} {...rest}>
      {src ? (
        <img src={src} alt={name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
      ) : (
        <span style={{
          width: "100%", height: "100%", borderRadius: "50%",
          background: `hsl(${hue} 52% 92%)`, color: `hsl(${hue} 45% 38%)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: px * 0.4, fontWeight: "var(--fw-semibold)",
        }}>{initials || "?"}</span>
      )}
      {status && (
        <span style={{
          position: "absolute", right: -1, bottom: -1,
          width: px * 0.28, height: px * 0.28, minWidth: 8, minHeight: 8,
          borderRadius: "50%", background: statusColors[status],
          border: "2px solid var(--color-card)",
        }} />
      )}
    </span>
  );
}
