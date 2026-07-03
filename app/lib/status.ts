/**
 * Application-status progression (shortlist capability, FR-LIST-02).
 * Saved → Submitted → Under review → Recommended → Enrolled.
 */
import type { ApplicationStatus } from "@/app/lib/types";

/** The five stages, in order. */
export const STATUSES: readonly ApplicationStatus[] = [
  "Збережено",
  "Подано",
  "Розглядається",
  "Рекомендовано",
  "Зараховано",
];

/** Design-system `.pk-status--*` modifier for each stage. */
export const STATUS_MODIFIER: Record<ApplicationStatus, string> = {
  Збережено: "saved",
  Подано: "submitted",
  Розглядається: "review",
  Рекомендовано: "recommend",
  Зараховано: "enrolled",
};

/** The stage after `status`, cycling back to the first from the last. */
export function nextStatus(status: ApplicationStatus): ApplicationStatus {
  const i = STATUSES.indexOf(status);
  return STATUSES[(i + 1) % STATUSES.length];
}
