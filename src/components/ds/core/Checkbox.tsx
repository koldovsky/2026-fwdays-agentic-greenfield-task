"use client";

import React from "react";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
}

const CheckGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export function Checkbox({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  id,
  className = "",
  ...rest
}: CheckboxProps): React.ReactElement {
  const reactId = React.useId();
  const cbId = id || reactId;
  const classes = ["ds-check", disabled ? "ds-check--disabled" : "", className].filter(Boolean).join(" ");
  return (
    <label className={classes} htmlFor={cbId}>
      <input
        id={cbId}
        type="checkbox"
        className="ds-check__native"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        {...rest}
      />
      <span className="ds-check__box"><CheckGlyph /></span>
      {label ? <span className="ds-check__label">{label}</span> : null}
    </label>
  );
}
