import React from "react";

/** Notely Spinner — small indeterminate loading indicator. */
export function Spinner({ size = 18, color = "currentColor", style, ...rest }) {
  return (
    <span role="status" aria-label="Loading" style={{
      display: "inline-block", width: size, height: size,
      border: `2px solid ${color}`, borderRightColor: "transparent",
      borderRadius: "50%", animation: "notely-spin 0.6s linear infinite",
      opacity: 0.85, ...style,
    }} {...rest} />
  );
}
