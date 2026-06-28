"use client";

import { ErrorState } from "@/components/states/ErrorState";
import { uk } from "@/lib/i18n/uk";

/**
 * Canonical cabinet error boundary (FR-SHELL-03). Catches any render throw in
 * the cabinet group and shows the shared `ErrorState` with a human-readable
 * Ukrainian message and a retry affordance — never a raw error, stack, or 500.
 * `reset` re-renders the segment, which is the retry. `error` is intentionally
 * not surfaced to the user.
 */
export default function CabinetError({ reset }: { error: Error; reset: () => void }) {
  const t = uk.shell.states;
  return (
    <div className="flex min-h-dvh w-full items-center justify-center px-[var(--space-9)]">
      <ErrorState title={t.errorTitle} body={t.errorBody} onRetry={reset} />
    </div>
  );
}
