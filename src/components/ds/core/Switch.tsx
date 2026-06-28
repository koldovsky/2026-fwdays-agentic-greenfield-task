"use client";

import React from "react";

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
}

export function Switch({
  label,
  checked,
  defaultChecked,
  onChange,
  disabled = false,
  id,
  className = "",
  ...rest
}: SwitchProps): React.ReactElement {
  const reactId = React.useId();
  const swId = id || reactId;
  const classes = ["ds-switch", disabled ? "ds-switch--disabled" : "", className].filter(Boolean).join(" ");
  return (
    <label className={classes} htmlFor={swId}>
      <input
        id={swId}
        type="checkbox"
        role="switch"
        className="ds-switch__native"
        checked={checked}
        defaultChecked={defaultChecked}
        onChange={onChange}
        disabled={disabled}
        {...rest}
      />
      <span className="ds-switch__track"><span className="ds-switch__thumb" /></span>
      {label ? <span className="ds-switch__label">{label}</span> : null}
    </label>
  );
}
