"use client";

import React from "react";

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "onChange" | "value"> {
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  onClear?: (e?: React.MouseEvent) => void;
  placeholder?: string;
  size?: "md" | "lg";
}

const SearchGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
  </svg>
);

const XGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export function SearchInput({
  value = "",
  onChange,
  onClear,
  placeholder = "Search Pokémon…",
  size = "md",
  className = "",
  ...rest
}: SearchInputProps): React.ReactElement {
  const classes = ["ds-search", size === "lg" ? "ds-search--lg" : "", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      <span className="ds-search__icon"><SearchGlyph /></span>
      <input
        type="search"
        className="ds-search__input"
        value={value}
        onChange={onChange as React.ChangeEventHandler<HTMLInputElement>}
        placeholder={placeholder}
        aria-label={(rest as { "aria-label"?: string })["aria-label"] || placeholder}
        {...rest}
      />
      {value ? (
        <button
          type="button"
          className="ds-search__clear"
          aria-label="Clear search"
          onClick={(e) => {
            if (onClear) onClear(e);
            else if (onChange) onChange({ target: { value: "" } });
          }}
        >
          <XGlyph />
        </button>
      ) : null}
    </div>
  );
}
