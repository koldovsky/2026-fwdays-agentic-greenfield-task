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
  readonly auth: {
    /** Sign-in page title (FR-AUTH-01). */
    readonly signInTitle: string;
    /** Sign-up mode title. */
    readonly signUpTitle: string;
    /** Short lead under the title. */
    readonly lead: string;
    readonly emailLabel: string;
    readonly passwordLabel: string;
    /** Optional display-name field on sign-up. */
    readonly nameLabel: string;
    readonly signInAction: string;
    readonly signUpAction: string;
    readonly signOutAction: string;
    /** Switch-mode prompts under the form. */
    readonly noAccountPrompt: string;
    readonly haveAccountPrompt: string;
    /**
     * Error copy. `invalidCredentials` is deliberately uniform for wrong
     * password vs unknown email — no account enumeration (FR-AUTH-01).
     */
    readonly error: {
      readonly invalidCredentials: string;
      readonly emailTaken: string;
      readonly invalidEmail: string;
      readonly weakPassword: string;
      readonly generic: string;
    };
  };
  readonly topBar: {
    /** Accessible label for the logo home link. */
    readonly homeLabel: string;
    /** Accessible label for the signed-in account area (FR-SHELL-01). */
    readonly accountLabel: string;
    readonly signIn: string;
    readonly tryFree: string;
    readonly navFeatures: string;
    readonly navPricing: string;
  };
}
