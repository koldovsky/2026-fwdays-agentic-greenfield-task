"use client";

import * as React from "react";

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> {
  label?: string;
  size?: "sm" | "md" | "lg";
  helperText?: string;
  error?: string;
}

const sizes = {
  sm: { fs: 13, px: 10, py: 8 },
  md: { fs: 14, px: 12, py: 10 },
  lg: { fs: 15, px: 14, py: 12 },
} as const;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    { label, size = "md", helperText, error, id, style, onFocus, onBlur, ...rest },
    ref
  ) {
    const [focus, setFocus] = React.useState(false);
    const generatedId = React.useId();
    const fieldId = id ?? generatedId;
    const invalid = Boolean(error);
    const s = sizes[size];

    const borderColor = invalid
      ? "var(--color-danger)"
      : focus
        ? "var(--color-primary)"
        : "var(--color-border-strong)";

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={fieldId}
            className="text-[13px] font-medium"
            style={{ color: "var(--color-text)" }}
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={fieldId}
          aria-invalid={invalid}
          onFocus={(event) => {
            setFocus(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocus(false);
            onBlur?.(event);
          }}
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: s.fs,
            padding: `${s.py}px ${s.px}px`,
            background: "var(--color-card)",
            color: "var(--color-text)",
            border: `1px solid ${borderColor}`,
            borderRadius: "var(--radius-md)",
            boxShadow: focus && !invalid ? "var(--shadow-focus)" : "none",
            outline: "none",
            resize: "vertical",
            transition:
              "border-color var(--duration-fast), box-shadow var(--duration-fast)",
            ...style,
          }}
          {...rest}
        />
        {(helperText || error) && (
          <span
            className="text-xs"
            style={{
              color: invalid
                ? "var(--color-danger)"
                : "var(--color-text-secondary)",
            }}
          >
            {error || helperText}
          </span>
        )}
      </div>
    );
  }
);
