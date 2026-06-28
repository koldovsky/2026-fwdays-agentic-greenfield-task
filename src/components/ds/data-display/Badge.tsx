import React from "react";

export type BadgeVariant =
  | "neutral"
  | "outline"
  | "solid"
  | "legendary"
  | "danger"
  | "success";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "md" | "lg";
  dot?: boolean;
  children?: React.ReactNode;
}

export function Badge({
  variant = "neutral",
  size = "md",
  dot = false,
  className = "",
  children,
  ...rest
}: BadgeProps): React.ReactElement {
  const classes = [
    "ds-badge",
    `ds-badge--${variant}`,
    size === "lg" ? "ds-badge--lg" : "",
    className,
  ].filter(Boolean).join(" ");
  return (
    <span className={classes} {...rest}>
      {dot ? <span className="ds-badge__dot" /> : null}
      {children}
    </span>
  );
}
