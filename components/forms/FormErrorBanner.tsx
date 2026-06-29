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
      className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
    >
      {message}
    </div>
  );
}
