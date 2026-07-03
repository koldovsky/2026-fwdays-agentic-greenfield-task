import React from "react";

/**
 * Round avatar. Renders an image when `src` is given, otherwise warm
 * amber-tinted initials.
 */
export function Avatar({ src, name = "", size = 44, style = {}, ...rest }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: "linear-gradient(160deg, var(--highlight-gold), var(--accent))",
        color: "var(--on-accent)",
        fontFamily: "var(--font-rounded)",
        fontWeight: "var(--weight-bold)",
        fontSize: size * 0.4,
        flex: "none",
        border: "1px solid var(--border)",
        ...style,
      }}
      {...rest}
    >
      {src ? (
        <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials || "🐝"
      )}
    </span>
  );
}
