// Centralized UI-string types (NFR-I18N-01). Framework-free, no runtime i18n lib.

import type { ChecklistStatus } from "../scoring/types";

export type Locale = "uk" | "en";

export interface Dictionary {
  readonly app: {
    readonly name: string;
  };
  readonly action: {
    readonly tailor: string;
  };
  readonly checklist: {
    /** Human labels for each of the 4 checklist statuses. */
    readonly statusLabel: Readonly<Record<ChecklistStatus, string>>;
    readonly scoreHeadline: string;
  };
  readonly bullets: {
    /** Section eyebrow / accessible label for the tailored-bullet list. */
    readonly listLabel: string;
    /** Label for the include-in-export toggle (FR-BULLETS-02). */
    readonly includeInExport: string;
    /** Shown on overclaim-risk bullets excluded by default (BC-HONESTY-02). */
    readonly excludedFromExport: string;
    /** Prefix for the grounding source sentence (FR-BULLETS-01). */
    readonly source: string;
  };
  readonly result: {
    /** Accessible region label for the two-column result view (FR-SHELL-02). */
    readonly regionLabel: string;
    /** Section eyebrow above the result view. */
    readonly eyebrow: string;
    /** Result view title. */
    readonly title: string;
  };
  readonly workspace: {
    /** Short lead line under the result title. */
    readonly lead: string;
  };
}
