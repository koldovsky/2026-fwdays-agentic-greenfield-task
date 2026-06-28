"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Centered modal dialog (BC-BRAND-01), ported from
 * `docs/KoloDesign/components/feedback/Dialog`. Scrim + white card with a
 * hairline border and the dialog shadow; title, body, then optional
 * right-aligned actions. The reference is presentational only — this port adds
 * the accessibility the design system implies (NFR-A11Y-01): `role="dialog"`
 * with `aria-modal`, Escape-to-close, scrim-click-to-close, body scroll lock,
 * initial focus into the card, and focus restored to the trigger on close.
 *
 * Focus trapping keeps Tab within the card while open. Use `children` for the
 * body (or a form) and the optional `actions` slot for a ghost cancel + primary
 * confirm; a form may instead keep its own submit button inside `children`.
 */

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type DialogProps = {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  open?: boolean;
};

export function Dialog({ title, children, actions, onClose, open = true }: DialogProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    // Move focus into the card on open (first focusable, else the card itself).
    const card = cardRef.current;
    const firstFocusable = card?.querySelector<HTMLElement>(FOCUSABLE);
    (firstFocusable ?? card)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || card === null) return;

      const focusable = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[900] flex items-center justify-center bg-[rgba(26,26,24,0.45)] p-[var(--space-8)]"
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="focus-ring w-full max-w-[480px] rounded-[var(--radius-md)] border border-line-strong bg-surface p-[var(--space-8)] shadow-[var(--shadow-dialog)]"
      >
        <h2
          id={titleId}
          className="mb-[var(--space-5)] text-[var(--text-md)] font-[var(--weight-medium)] text-ink"
        >
          {title}
        </h2>
        <div className="text-ink-muted">{children}</div>
        {actions !== undefined ? (
          <div className="mt-[var(--space-8)] flex justify-end gap-[var(--space-5)]">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
