import type { InputHTMLAttributes } from "react";

/**
 * Text input (BC-BRAND-01), ported from `docs/KoloDesign/components/forms/Input`:
 * hairline `--line-strong` border, 8px radius, paper fill (sits inside a white
 * card), 14px body type. The shared `focus-ring` provides the visible 2px accent
 * focus ring (NFR-A11Y-01). `aria-invalid`/`aria-describedby` are passed through
 * by the caller so the inline error is announced.
 */
export function Input({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={
        "focus-ring w-full rounded-[var(--radius-md)] border border-line-strong bg-paper " +
        "px-[var(--space-6)] py-[var(--space-5)] text-[var(--text-body)] text-ink " +
        "aria-[invalid=true]:border-[var(--danger-ink)]" +
        (className ? ` ${className}` : "")
      }
    />
  );
}
