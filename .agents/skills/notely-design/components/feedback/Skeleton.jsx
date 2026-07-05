import React from "react";

/** Notely Skeleton — shimmer placeholder for loading content. */
export function Skeleton({ width = "100%", height = 14, radius = "var(--radius-sm)", circle = false, style, ...rest }) {
  return (
    <span style={{
      display: "block",
      width: circle ? height : width,
      height,
      borderRadius: circle ? "50%" : radius,
      background: "linear-gradient(90deg, var(--color-bg) 25%, var(--color-border) 50%, var(--color-bg) 75%)",
      backgroundSize: "200% 100%",
      animation: "notely-shimmer 1.4s ease-in-out infinite",
      ...style,
    }} {...rest} />
  );
}
