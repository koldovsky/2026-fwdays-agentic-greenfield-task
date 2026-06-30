import {
  Activity,
  Field,
  Goal,
  QuestionKind,
  Sex,
  type ChoiceOption,
  type NumericRange,
  type Question,
} from './types.js';

// The onboarding question set (US-1). Prompt prose is Ukrainian (the bot's voice); button values are
// English enum literals (invariant #6). flow.ts picks the next unanswered question.

export const DEFAULT_TZ = 'Europe/Kyiv';

const SEX_OPTIONS: ChoiceOption[] = [
  { label: 'Чоловіча', value: Sex.MALE },
  { label: 'Жіноча', value: Sex.FEMALE },
];

const GOAL_OPTIONS: ChoiceOption[] = [
  { label: 'Схуднення', value: Goal.CUT },
  { label: 'Підтримка', value: Goal.MAINTAIN },
  { label: 'Набір', value: Goal.LEAN_BULK },
];

const ACTIVITY_OPTIONS: ChoiceOption[] = [
  { label: 'Сидячий', value: Activity.SEDENTARY },
  { label: 'Легка активність', value: Activity.LIGHT },
  { label: 'Помірна', value: Activity.MODERATE },
  { label: 'Висока', value: Activity.ACTIVE },
  { label: 'Дуже висока', value: Activity.VERY_ACTIVE },
];

const TZ_OPTIONS: ChoiceOption[] = [
  { label: `${DEFAULT_TZ} (за замовчуванням)`, value: DEFAULT_TZ },
];

const AGE_RANGE: NumericRange = { min: 13, max: 100, integer: true };
const HEIGHT_RANGE: NumericRange = { min: 100, max: 250, integer: true };
const WEIGHT_RANGE: NumericRange = { min: 30, max: 400, integer: false }; // body_metrics weight is Decimal

export const QUESTIONS: Record<Field, Question> = {
  [Field.AGE]: {
    field: Field.AGE,
    kind: QuestionKind.NUMERIC,
    prompt: 'Скільки тобі років?',
    range: AGE_RANGE,
  },
  [Field.SEX]: {
    field: Field.SEX,
    kind: QuestionKind.CHOICE,
    prompt: 'Яка твоя стать?',
    options: SEX_OPTIONS,
  },
  [Field.HEIGHT_CM]: {
    field: Field.HEIGHT_CM,
    kind: QuestionKind.NUMERIC,
    prompt: 'Який твій зріст (см)?',
    range: HEIGHT_RANGE,
  },
  [Field.WEIGHT_KG]: {
    field: Field.WEIGHT_KG,
    kind: QuestionKind.NUMERIC,
    prompt: 'Яка твоя вага (кг)?',
    range: WEIGHT_RANGE,
  },
  [Field.GOAL]: {
    field: Field.GOAL,
    kind: QuestionKind.CHOICE,
    prompt: 'Яка твоя ціль?',
    options: GOAL_OPTIONS,
  },
  [Field.ACTIVITY]: {
    field: Field.ACTIVITY,
    kind: QuestionKind.CHOICE,
    prompt: 'Який твій рівень активності?',
    options: ACTIVITY_OPTIONS,
  },
  [Field.TZ]: {
    field: Field.TZ,
    kind: QuestionKind.CHOICE,
    prompt: 'Який твій часовий пояс?',
    options: TZ_OPTIONS,
  },
};

/** Parse + range-check a free-text number; `null` when unparseable or out of range (caller re-asks). */
export const parseNumericAnswer = (raw: string, range: NumericRange): number | null => {
  const value = Number(raw.trim().replace(',', '.'));
  if (!Number.isFinite(value) || value < range.min || value > range.max) {
    return null;
  }
  if (range.integer && !Number.isInteger(value)) {
    return null;
  }
  return value;
};

/** Validate a choice answer against a question's options; returns the literal value or `null`. */
export const validateChoice = (raw: string, question: Question): string | null =>
  question.options?.find((o) => o.value === raw.trim())?.value ?? null;
