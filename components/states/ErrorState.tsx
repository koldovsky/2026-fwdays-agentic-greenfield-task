"use client";

import { AlertCircle } from "lucide-react";
import { uk } from "@/lib/i18n/uk";

/**
 * The canonical error state (FR-SHELL-03): a human-readable message and a retry
 * affordance — never a raw error, stack trace, or HTTP 500. Client component
 * because it owns the retry callback. Status is conveyed by a text label, not
 * colour alone. The mid-session 401/403 hand-off is handled upstream by
 * `app/(cabinet)/auth-redirect.ts` (built on pure `lib/http/auth-redirect.ts`);
 * this state covers all other failures.
 */
export function ErrorState({
  title = uk.shell.states.errorTitle,
  body = uk.shell.states.errorBody,
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  const t = uk.shell.states;

  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-[var(--space-6)] py-[var(--space-11)] text-center"
    >
      <AlertCircle
        aria-hidden="true"
        size={28}
        strokeWidth={1.8}
        className="text-[var(--danger-ink)]"
      />
      <div className="flex max-w-[var(--content-narrow)] flex-col gap-[var(--space-3)]">
        <p className="text-[var(--text-md)] font-[var(--weight-medium)] text-ink">{title}</p>
        <p className="text-[var(--text-base)] text-ink-muted">{body}</p>
      </div>
      {onRetry !== undefined ? (
        <button
          type="button"
          onClick={onRetry}
          className="focus-ring mt-[var(--space-3)] rounded-[var(--radius-md)] border border-line-strong bg-surface px-[var(--space-7)] py-[var(--space-5)] text-[var(--text-base)] font-[var(--weight-medium)] text-ink transition-colors duration-[var(--motion-fast)] hover:bg-[var(--line-faint)]"
        >
          {t.retry}
        </button>
      ) : null}
    </div>
  );
}
