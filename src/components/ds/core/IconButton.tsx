"use client";

import React from "react";

export type IconButtonSize = "sm" | "md" | "lg";
export type IconButtonVariant = "ghost" | "outline" | "solid";

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  label: string;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function IconButton({
  size = "md",
  variant = "ghost",
  label,
  disabled = false,
  className = "",
  children,
  ...rest
}: IconButtonProps): React.ReactElement {
  const classes = [
    "ds-iconbtn",
    size !== "md" ? `ds-iconbtn--${size}` : "",
    variant !== "ghost" ? `ds-iconbtn--${variant}` : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button className={classes} aria-label={label} title={label} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}
