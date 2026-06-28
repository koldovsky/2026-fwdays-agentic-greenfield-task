import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  interactive?: boolean;
  padded?: boolean;
  as?: keyof React.JSX.IntrinsicElements;
  href?: string;
  children?: React.ReactNode;
}

export function Card({
  interactive = false,
  padded = false,
  as,
  href,
  className = "",
  children,
  ...rest
}: CardProps): React.ReactElement {
  const Tag = (as || (href ? "a" : "div")) as React.ElementType;
  const classes = [
    "ds-card",
    padded ? "ds-card--pad" : "",
    interactive || href ? "ds-card--interactive" : "",
    className,
  ].filter(Boolean).join(" ");
  return (
    <Tag className={classes} href={href} {...rest}>
      {children}
    </Tag>
  );
}
