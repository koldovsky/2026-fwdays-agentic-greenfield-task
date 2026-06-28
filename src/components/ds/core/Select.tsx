"use client";

import React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  label?: string;
  options?: Array<string | SelectOption>;
  placeholder?: string;
  size?: "sm" | "md";
  children?: React.ReactNode;
}

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export function Select({
  label,
  options = [],
  placeholder,
  size = "md",
  id,
  className = "",
  children,
  ...rest
}: SelectProps): React.ReactElement {
  const reactId = React.useId();
  const selectId = id || reactId;
  const selectClasses = ["ds-select", size !== "md" ? `ds-select--${size}` : "", className].filter(Boolean).join(" ");

  const control = (
    <div className="ds-select-wrap">
      <select id={selectId} className={selectClasses} {...rest}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {children
          ? children
          : options.map((o) => {
              const opt = typeof o === "string" ? { value: o, label: o } : o;
              return <option key={opt.value} value={opt.value}>{opt.label}</option>;
            })}
      </select>
      <span className="ds-select__chevron"><Chevron /></span>
    </div>
  );

  if (!label) return control;
  return (
    <div className="ds-select-field">
      <label className="ds-select-field__label" htmlFor={selectId}>{label}</label>
      {control}
    </div>
  );
}
