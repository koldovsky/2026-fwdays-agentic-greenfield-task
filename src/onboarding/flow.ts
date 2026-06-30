import { tenantWhere } from '../db/tenancy.js';
import { resolveDate } from '../router/date.js';
import { computeTargets } from './calculator.js';
import { parseNumericAnswer, QUESTIONS, validateChoice } from './questions.js';
import { AnswerStatus, Field, QuestionKind } from './types.js';
import type {
  Activity,
  AnswerResult,
  Goal,
  OnboardingClient,
  OnboardingService,
  Question,
  Sex,
  StartResult,
  Targets,
} from './types.js';

// Onboarding flow (US-1, ADR-0016): the DB IS the state machine. The next question is the first
// unanswered field; answers persist as they arrive, so a restart resumes mid-flow (invariant #1).
// Completion = targets computed. Weight lives in body_metrics, not users.

interface OnboardingState {
  id: number;
  tz: string;
  targetKcal: number | null;
  targetProteinG: unknown; // Prisma Decimal | null — coerced via Number() at the boundary
  targetFatG: unknown;
  targetCarbsG: unknown;
  age: number | null;
  sex: string | null;
  heightCm: number | null;
  goal: string | null;
  activity: string | null;
  hasWeight: boolean;
}

const USER_SELECT = {
  id: true,
  tz: true,
  targetKcal: true,
  targetProteinG: true,
  targetFatG: true,
  targetCarbsG: true,
  age: true,
  sex: true,
  heightCm: true,
  goal: true,
  activity: true,
} as const;

const storedTargets = (s: OnboardingState): Targets => ({
  kcal: s.targetKcal!,
  proteinG: Number(s.targetProteinG),
  fatG: Number(s.targetFatG),
  carbsG: Number(s.targetCarbsG),
});

/** The user-local calendar day as a `@db.Date` value (UTC midnight, no TZ skew). */
const todayDate = (tz: string): Date =>
  new Date(`${resolveDate('today', tz, new Date())}T00:00:00.000Z`);

// tz is asked last (one-tap default confirm); completion gates on targets, not tz (its column
// always defaults to a value, so it can't gate the sequence).
const nextQuestion = (s: OnboardingState): Question | null => {
  if (s.targetKcal !== null) {
    return null;
  }
  if (s.age === null) {
    return QUESTIONS[Field.AGE];
  }
  if (s.sex === null) {
    return QUESTIONS[Field.SEX];
  }
  if (s.heightCm === null) {
    return QUESTIONS[Field.HEIGHT_CM];
  }
  if (!s.hasWeight) {
    return QUESTIONS[Field.WEIGHT_KG];
  }
  if (s.goal === null) {
    return QUESTIONS[Field.GOAL];
  }
  if (s.activity === null) {
    return QUESTIONS[Field.ACTIVITY];
  }
  return QUESTIONS[Field.TZ];
};

export const createOnboardingService = (prisma: OnboardingClient): OnboardingService => {
  const loadState = async (chatId: bigint): Promise<OnboardingState | null> => {
    const user = await prisma.user.findUnique({ where: { chatId }, select: USER_SELECT });
    if (!user) {
      return null;
    }
    const weightRow = await prisma.bodyMetric.findFirst({
      where: tenantWhere(user.id, { weightKg: { not: null } }),
      select: { id: true },
    });
    return { ...user, hasWeight: weightRow !== null };
  };

  const completeOnboarding = async (state: OnboardingState): Promise<Targets> => {
    const weightRow = await prisma.bodyMetric.findFirst({
      where: tenantWhere(state.id, { weightKg: { not: null } }),
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      select: { weightKg: true },
    });
    if (
      state.age === null ||
      state.sex === null ||
      state.heightCm === null ||
      state.goal === null ||
      state.activity === null ||
      weightRow?.weightKg == null
    ) {
      throw new Error('completeOnboarding called with incomplete state');
    }
    const targets = computeTargets({
      age: state.age,
      sex: state.sex as Sex,
      heightCm: state.heightCm,
      weightKg: Number(weightRow.weightKg),
      activity: state.activity as Activity,
      goal: state.goal as Goal,
    });
    await prisma.user.update({
      where: { id: state.id },
      data: {
        targetKcal: targets.kcal,
        targetProteinG: targets.proteinG,
        targetFatG: targets.fatG,
        targetCarbsG: targets.carbsG,
      },
    });
    return targets;
  };

  // Persist one answer. Weight is a body_metrics row (dated today, user TZ); every other field is a
  // users column. No in-memory mirror — submitAnswer re-reads to advance, so the DB stays the single
  // source of truth within the turn too (ADR-0016).
  const persistAnswer = async (
    state: OnboardingState,
    question: Question,
    value: string | number,
  ): Promise<void> => {
    if (question.field === Field.WEIGHT_KG) {
      if (state.hasWeight) {
        return; // idempotent (tasks.md 3.2): never insert a second weight row
      }
      await prisma.bodyMetric.create({
        data: { userId: state.id, date: todayDate(state.tz), weightKg: value as number },
      });
      return;
    }
    // Column writes are reached only for the first still-null field (nextQuestion gate), so they are
    // already idempotent by construction — re-answering an answered field never lands here.
    await prisma.user.update({ where: { id: state.id }, data: { [question.field]: value } });
  };

  return {
    async startSession(chatId): Promise<StartResult> {
      // Atomic: two simultaneous /start for an unseen chat (Telegram retries) must not both create.
      await prisma.user.upsert({ where: { chatId }, create: { chatId }, update: {} });
      const state = await loadState(chatId);
      if (!state) {
        throw new Error('startSession: user row missing after upsert');
      }
      const question = nextQuestion(state);
      if (question === null) {
        return { question: null, targets: storedTargets(state) };
      }
      return { question };
    },

    async submitAnswer(chatId, raw): Promise<AnswerResult> {
      const state = await loadState(chatId);
      if (!state) {
        throw new Error('submitAnswer called for a chat with no user row');
      }
      const question = nextQuestion(state);
      if (question === null) {
        // Already onboarded (e.g. a stale keyboard tap after completion) — return the stored
        // targets, don't recompute and rewrite them.
        return { status: AnswerStatus.COMPLETE, targets: storedTargets(state) };
      }

      const value =
        question.kind === QuestionKind.NUMERIC
          ? parseNumericAnswer(raw, question.range!)
          : validateChoice(raw, question);
      if (value === null) {
        return { status: AnswerStatus.INVALID, question };
      }

      await persistAnswer(state, question, value);

      // Re-read once: this authoritative post-write state drives both completion and advancement.
      const advanced = await loadState(chatId);
      if (!advanced) {
        throw new Error('submitAnswer: user row missing after persist');
      }
      if (question.field === Field.TZ) {
        return { status: AnswerStatus.COMPLETE, targets: await completeOnboarding(advanced) };
      }
      const next = nextQuestion(advanced);
      if (next === null) {
        throw new Error('submitAnswer: no next question after a non-final answer');
      }
      return { status: AnswerStatus.NEXT, question: next };
    },

    async isOnboarding(chatId): Promise<boolean> {
      const state = await loadState(chatId);
      return state !== null && nextQuestion(state) !== null;
    },
  };
};
