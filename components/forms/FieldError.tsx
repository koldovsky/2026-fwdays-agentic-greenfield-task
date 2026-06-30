// Shared <FieldError> (design.md D4) — FR-SHELL-03, NFR-A11Y-04.
// Given a field `id` and an optional `message`: renders nothing when empty;
// when present renders <p id="{id}-error" role="alert"> with the Ukrainian
// message. Convention: every form field has a stable `id`, and its owning input
// wires aria-invalid + aria-describedby="{id}-error" so the message is
// programmatically associated for assistive tech.

export interface FieldErrorProps {
  /** The owning field's id; the error element is `{id}-error`. */
  id: string;
  /** Ukrainian error message; nothing renders when empty/undefined. */
  message?: string;
}

export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p id={`${id}-error`} role="alert" className="mt-1 font-body text-sm text-danger">
      {message}
    </p>
  );
}
