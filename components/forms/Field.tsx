import type { ReactNode } from "react";

/**
 * Form field wrapper (NFR-A11Y-01), ported from the Kolo360 design system: a
 * sentence-case 13px muted label, an optional hint, the control, and an inline
 * error slot. The label associates with the control via `htmlFor`/`id`, and the
 * error is exposed as `aria-describedby` with `aria-invalid` on the control —
 * the caller wires those ids through. Status (error) reads as text, not colour
 * alone (NFR-A11Y-02).
 */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      <label htmlFor={id} className="text-[var(--text-base)] text-ink-muted">
        {label}
        {hint !== undefined ? (
          <span className="ml-[var(--space-3)] text-[var(--text-xs)] text-line-strong">{hint}</span>
        ) : null}
      </label>
      {children}
      {error !== undefined ? (
        <p id={errorId} role="alert" className="text-[var(--text-base)] text-[var(--danger-ink)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
