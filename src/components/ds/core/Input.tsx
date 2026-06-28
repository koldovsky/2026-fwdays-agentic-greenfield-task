"use client";

import React from "react";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  hint?: string;
  error?: string;
  size?: InputSize;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export function Input({
  label,
  hint,
  error,
  size = "md",
  iconLeft = null,
  iconRight = null,
  id,
  className = "",
  ...rest
}: InputProps): React.ReactElement {
  const reactId = React.useId();
  const inputId = id || reactId;
  const inputClasses = [
    "ds-input",
    size !== "md" ? `ds-input--${size}` : "",
    error ? "ds-input--error" : "",
    iconLeft ? "ds-input--with-icon-left" : "",
    iconRight ? "ds-input--with-icon-right" : "",
    className,
  ].filter(Boolean).join(" ");

  const field = (
    <div className="ds-input-wrap">
      {iconLeft ? <span className="ds-input-icon ds-input-icon--left">{iconLeft}</span> : null}
      <input id={inputId} className={inputClasses} aria-invalid={error ? true : undefined} {...rest} />
      {iconRight ? <span className="ds-input-icon ds-input-icon--right">{iconRight}</span> : null}
    </div>
  );

  if (!label && !hint && !error) return field;

  return (
    <div className="ds-field">
      {label ? <label className="ds-field__label" htmlFor={inputId}>{label}</label> : null}
      {field}
      {error
        ? <span className="ds-field__hint ds-field__hint--error">{error}</span>
        : hint ? <span className="ds-field__hint">{hint}</span> : null}
    </div>
  );
}
