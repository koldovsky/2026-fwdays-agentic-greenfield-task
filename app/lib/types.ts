/**
 * Shared domain types for Prokhidnyi.
 *
 * The scoring model (see `scoring.ts`) and the program registry (`programs.ts`)
 * both depend on these. Kept framework-free so the domain logic stays pure and
 * unit-testable (scoring-engine capability).
 */

/** Coefficient/score keys. `eng` is the elective ("4th subject") slot — its
 *  label changes with the chosen elective, but the weight key is stable. */
export type SubjectKey = "ukr" | "math" | "hist" | "eng";

/** The four required-slot labels; `eng` is overridden by the chosen elective. */
export const REQUIRED_SUBJECTS: Record<Exclude<SubjectKey, "eng">, string> = {
  ukr: "Українська мова",
  math: "Математика",
  hist: "Історія України",
};

/** Elective ("4th") subjects a program may accept for the `eng` slot. */
export type ElectiveSubject =
  | "Англійська"
  | "Біологія"
  | "Фізика"
  | "Хімія"
  | "Географія"
  | "Німецька";

export const ELECTIVE_SUBJECTS: readonly ElectiveSubject[] = [
  "Англійська",
  "Біологія",
  "Фізика",
  "Хімія",
  "Географія",
  "Німецька",
] as const;

/** Weighting coefficients for a program (each subject's share of the score). */
export type Coefficients = Partial<Record<SubjectKey, number>>;

/** A single study program at a university (program-data, §10 registry). */
export interface Program {
  /** Stable slug id. */
  id: string;
  /** University name. */
  uni: string;
  /** Program / specialty name. */
  spec: string;
  /** Field of study (used for filtering). */
  field: string;
  /** City (used for filtering). */
  city: string;
  /** Subject weighting coefficients (sum to 1.0). */
  coeff: Coefficients;
  /** Passing (cutoff) scores for the last three years. */
  cutoffs: { 2022: number; 2023: number; 2024: number };
  /** Number of state-funded (budget) seats. */
  budgetSeats: number;
  /** Annual tuition for the contract form, human-readable (e.g. "68 тис"). */
  tuition: string;
  /** Dormitory available. */
  dorm: boolean;
  /** Elective ("4th") NMT subjects this program accepts. */
  electives: ElectiveSubject[];
}

/** NMT scores the applicant entered (100–200 each). */
export type Scores = Record<SubjectKey, number>;

/** Benefit toggles that raise the competitive score (FR-INPUT-03). */
export interface Benefits {
  /** Rural-school coefficient. */
  village: boolean;
  /** Preferential quota (separate competition). */
  quota: boolean;
  /** Special conditions: orphans, IDPs, veterans' families. */
  orphan: boolean;
}

/** Risk category of a chance estimate (traffic-light, product-critical). */
export type Category = "safe" | "real" | "dream";

/** Application status stages (FR-LIST-02). */
export type ApplicationStatus =
  | "Збережено"
  | "Подано"
  | "Розглядається"
  | "Рекомендовано"
  | "Зараховано";
