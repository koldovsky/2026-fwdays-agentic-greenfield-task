// Shared form-error banner (design.md D4) — FR-SHELL-03.
// Given an optional `message` (from an ActionResult's `formError`): renders
// nothing when empty; when present renders a top-of-form role="alert" banner
// with the Ukrainian message. This is the visible target for whole-form
// failures (translated DB constraints, generic errors).

export interface FormErrorBannerProps {
  /** Whole-form Ukrainian error message; nothing renders when empty. */
  message?: string;
}

export function FormErrorBanner({ message }: FormErrorBannerProps) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="mb-4 rounded-[13px] border border-status-overdue-dot/40 bg-status-overdue-chip px-4 py-3 font-body text-sm text-status-overdue-text"
    >
      {message}
    </div>
  );
}
