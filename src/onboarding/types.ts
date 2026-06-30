import type { PrismaClient } from '@prisma/client';

// Domain value sets. Enum members are UPPER_CASE; the stored value stays lowercase English so the
// DB matches the rest of the domain (meal:'lunch', source:'estimate') and invariant #6 holds.

export enum Sex {
  MALE = 'male',
  FEMALE = 'female',
}

export enum Goal {
  CUT = 'cut',
  MAINTAIN = 'maintain',
  LEAN_BULK = 'lean_bulk',
}

export enum Activity {
  SEDENTARY = 'sedentary',
  LIGHT = 'light',
  MODERATE = 'moderate',
  ACTIVE = 'active',
  VERY_ACTIVE = 'very_active',
}

// Onboarding field keys. Values are the exact Prisma column names (weightKg is the body_metrics
// column, asked but stored separately) — used both as object keys and as Prisma write targets.
export enum Field {
  AGE = 'age',
  SEX = 'sex',
  HEIGHT_CM = 'heightCm',
  WEIGHT_KG = 'weightKg',
  GOAL = 'goal',
  ACTIVITY = 'activity',
  TZ = 'tz',
}

export enum QuestionKind {
  NUMERIC = 'numeric',
  CHOICE = 'choice',
}

export enum AnswerStatus {
  INVALID = 'invalid',
  NEXT = 'next',
  COMPLETE = 'complete',
}

export interface TargetInputs {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: Goal;
}

export interface Targets {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export interface ChoiceOption {
  label: string; // localized prose shown on the button
  value: string; // recorded English literal (an enum value)
}

export interface NumericRange {
  min: number;
  max: number;
  integer: boolean; // age/height are Int columns — reject decimals before they 400 at Prisma
}

export interface Question {
  field: Field;
  kind: QuestionKind;
  prompt: string;
  options?: ChoiceOption[]; // iff kind === CHOICE
  range?: NumericRange; // iff kind === NUMERIC
}

export type AnswerResult =
  | { status: AnswerStatus.INVALID; question: Question } // re-ask, nothing persisted
  | { status: AnswerStatus.NEXT; question: Question } // advanced to the next field
  | { status: AnswerStatus.COMPLETE; targets: Targets };

export interface StartResult {
  question: Question | null; // null = already onboarded
  targets?: Targets; // present iff already onboarded
}

export interface OnboardingService {
  startSession: (chatId: bigint) => Promise<StartResult>;
  submitAnswer: (chatId: bigint, raw: string) => Promise<AnswerResult>;
  isOnboarding: (chatId: bigint) => Promise<boolean>;
}

// Narrow structural surface over Prisma — a real PrismaClient satisfies it; tests pass a cast mock.
export type OnboardingClient = Pick<PrismaClient, 'user' | 'bodyMetric'>;
