import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { handleCallback, handleStart, handleText } from '../../src/bot/bot.js';
import type { BotDeps } from '../../src/bot/types.js';
import type { FoodService } from '../../src/food/types.js';
import type { MetricsService } from '../../src/metrics/types.js';
import { QUESTIONS } from '../../src/onboarding/questions.js';
import { AnswerStatus, Field, type OnboardingService } from '../../src/onboarding/types.js';
import type { QueryService } from '../../src/query/types.js';

const makeOnboarding = (over: Partial<OnboardingService> = {}): OnboardingService => ({
  startSession: vi.fn().mockResolvedValue({ question: QUESTIONS[Field.AGE] }),
  submitAnswer: vi
    .fn()
    .mockResolvedValue({ status: AnswerStatus.NEXT, question: QUESTIONS[Field.SEX] }),
  isOnboarding: vi.fn().mockResolvedValue(false),
  ...over,
});

const makeFood = (over: Partial<FoodService> = {}): FoodService => ({
  logFood: vi.fn().mockResolvedValue({ text: 'Записал: тест — 100 ккал · Б 1 / Ж 1 / У 1 г.' }),
  saveToCatalog: vi.fn().mockResolvedValue({ saved: true, entryName: 'тест' }),
  correctLast: vi
    .fn()
    .mockResolvedValue({ text: 'Исправил: тест — 150 ккал · Б 1 / Ж 1 / У 1 г.' }),
  ...over,
});

const makeMetrics = (over: Partial<MetricsService> = {}): MetricsService => ({
  logMetric: vi.fn().mockResolvedValue({ text: 'Записал:\nВес: 89.2 кг' }),
  ...over,
});

const makeQuery = (over: Partial<QueryService> = {}): QueryService => ({
  answerQuery: vi.fn().mockResolvedValue({ text: 'Калории: 1200 ккал' }),
  ...over,
});

const makeDeps = (
  onboarding: OnboardingService,
  intent = 'query',
  food: FoodService = makeFood(),
  metrics: MetricsService = makeMetrics(),
  query: QueryService = makeQuery(),
): {
  deps: BotDeps;
  create: ReturnType<typeof vi.fn>;
  food: FoodService;
  metrics: MetricsService;
  query: QueryService;
} => {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ intent, date: 'today' }) }],
    usage: {},
  });
  const anthropic = { messages: { create } } as unknown as Anthropic;
  return {
    deps: { anthropic, userTz: 'Europe/Kyiv', onboarding, food, metrics, query },
    create,
    food,
    metrics,
    query,
  };
};

describe('handleStart', () => {
  it('creates/loads the user and asks the first onboarding question', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding();
    const { deps } = makeDeps(onboarding);

    await handleStart({ chat: { id: 42 }, reply }, deps);

    expect(onboarding.startSession).toHaveBeenCalledWith(42n);
    expect(reply).toHaveBeenCalled();
    expect(String(reply.mock.calls.at(-1)?.[0])).toContain(QUESTIONS[Field.AGE].prompt);
  });

  it('greets a fully-onboarded user with their targets (no question)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding({
      startSession: vi.fn().mockResolvedValue({
        question: null,
        targets: { kcal: 2200, proteinG: 160, fatG: 70, carbsG: 250 },
      }),
    });
    const { deps } = makeDeps(onboarding);

    await handleStart({ chat: { id: 42 }, reply }, deps);

    expect(String(reply.mock.calls[0]?.[0])).toContain('2200');
  });
});

describe('handleText', () => {
  it('routes an onboarding answer to the flow, not the classifier', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding({ isOnboarding: vi.fn().mockResolvedValue(true) });
    const { deps, create } = makeDeps(onboarding);

    await handleText({ message: { text: '32' }, chat: { id: 7 }, reply }, deps);

    expect(onboarding.submitAnswer).toHaveBeenCalledWith(7n, '32');
    expect(create).not.toHaveBeenCalled();
  });

  it('explains the expected numeric range on an invalid answer (spec: explain expected input)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding({
      isOnboarding: vi.fn().mockResolvedValue(true),
      submitAnswer: vi
        .fn()
        .mockResolvedValue({ status: AnswerStatus.INVALID, question: QUESTIONS[Field.AGE] }),
    });
    const { deps } = makeDeps(onboarding);

    await handleText({ message: { text: '999' }, chat: { id: 7 }, reply }, deps);

    const hint = String(reply.mock.calls[0]?.[0]);
    expect(hint).toContain(String(QUESTIONS[Field.AGE].range?.min));
    expect(hint).toContain(String(QUESTIONS[Field.AGE].range?.max));
  });

  it('falls through to the classifier when onboarding is complete', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding({ isOnboarding: vi.fn().mockResolvedValue(false) });
    const { deps, create } = makeDeps(onboarding, 'review_trigger');

    await handleText({ message: { text: 'как там моя неделя?' }, chat: { id: 7 }, reply }, deps);

    expect(onboarding.submitAnswer).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
    expect(String(reply.mock.calls[0]?.[0])).toContain('review_trigger');
  });

  it('routes a `query` intent to the query service and replies with its answer', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding({ isOnboarding: vi.fn().mockResolvedValue(false) });
    const query = makeQuery({
      answerQuery: vi.fn().mockResolvedValue({ text: 'Белки: 120 из 160 г (осталось 40 г)' }),
    });
    const { deps } = makeDeps(onboarding, 'query', makeFood(), makeMetrics(), query);

    await handleText({ message: { text: 'сколько белка сегодня?' }, chat: { id: 7 }, reply }, deps);

    expect(query.answerQuery).toHaveBeenCalledWith(
      7n,
      'сколько белка сегодня?',
      expect.objectContaining({ intent: 'query' }),
    );
    expect(String(reply.mock.calls[0]?.[0])).toContain('120');
  });

  it('does not reply when the query service returns null (unknown chat_id)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding({ isOnboarding: vi.fn().mockResolvedValue(false) });
    const query = makeQuery({ answerQuery: vi.fn().mockResolvedValue(null) });
    const { deps } = makeDeps(onboarding, 'query', makeFood(), makeMetrics(), query);

    await handleText({ message: { text: 'сколько белка?' }, chat: { id: 7 }, reply }, deps);

    expect(reply).not.toHaveBeenCalled();
  });

  it('routes a `log` intent to the food service and replies with its confirmation', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding({ isOnboarding: vi.fn().mockResolvedValue(false) });
    const food = makeFood({
      logFood: vi.fn().mockResolvedValue({
        text: 'Записал: курица — 330 ккал',
        addToCatalog: { id: 5, label: '➕ В базу продуктов' },
      }),
    });
    const { deps } = makeDeps(onboarding, 'log', food);

    await handleText({ message: { text: '200г куриного филе' }, chat: { id: 7 }, reply }, deps);

    expect(food.logFood).toHaveBeenCalledWith(
      7n,
      '200г куриного филе',
      expect.objectContaining({ intent: 'log' }),
    );
    expect(String(reply.mock.calls[0]?.[0])).toContain('330');
    // Estimate path → the add-to-Food-DB button rides along.
    expect(reply.mock.calls[0]?.[1]).toHaveProperty('reply_markup');
  });

  it('routes a `correction` intent to the food service and replies with the corrected confirmation', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding({ isOnboarding: vi.fn().mockResolvedValue(false) });
    const food = makeFood({
      correctLast: vi.fn().mockResolvedValue({ text: 'Исправил: курица — 248 ккал' }),
    });
    const { deps } = makeDeps(onboarding, 'correction', food);

    await handleText({ message: { text: 'нет, 150г' }, chat: { id: 7 }, reply }, deps);

    expect(food.correctLast).toHaveBeenCalledWith(
      7n,
      'нет, 150г',
      expect.objectContaining({ intent: 'correction' }),
    );
    expect(String(reply.mock.calls[0]?.[0])).toContain('248');
  });

  it('does not reply when the correction service returns null (unknown chat_id)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding({ isOnboarding: vi.fn().mockResolvedValue(false) });
    const food = makeFood({ correctLast: vi.fn().mockResolvedValue(null) });
    const { deps } = makeDeps(onboarding, 'correction', food);

    await handleText({ message: { text: 'нет, 150г' }, chat: { id: 7 }, reply }, deps);

    expect(reply).not.toHaveBeenCalled();
  });

  it('routes a `metric` intent to the metrics service and replies with its confirmation', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding({ isOnboarding: vi.fn().mockResolvedValue(false) });
    const metrics = makeMetrics({
      logMetric: vi.fn().mockResolvedValue({ text: 'Записал:\nВес: 89.2 кг (↓0.8 с 2026-06-22)' }),
    });
    const { deps } = makeDeps(onboarding, 'metric', makeFood(), metrics);

    await handleText({ message: { text: 'вес 89.2' }, chat: { id: 7 }, reply }, deps);

    expect(metrics.logMetric).toHaveBeenCalledWith(
      7n,
      'вес 89.2',
      expect.objectContaining({ intent: 'metric' }),
    );
    expect(String(reply.mock.calls[0]?.[0])).toContain('89.2');
  });

  it('persists a logged estimate to the catalog on a `food:addfdb:` tap', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const answerCallbackQuery = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding();
    const food = makeFood({
      saveToCatalog: vi.fn().mockResolvedValue({ saved: true, entryName: 'борщ' }),
    });
    const { deps } = makeDeps(onboarding, 'log', food);

    await handleCallback(
      { callbackQuery: { data: 'food:addfdb:5' }, chat: { id: 9 }, reply, answerCallbackQuery },
      deps,
    );

    expect(answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(food.saveToCatalog).toHaveBeenCalledWith(9n, 5);
    expect(onboarding.submitAnswer).not.toHaveBeenCalled();
  });

  it('skips commands (no onboarding lookup, no classifier call)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding();
    const { deps, create } = makeDeps(onboarding);

    await handleText({ message: { text: '/start' }, chat: { id: 7 }, reply }, deps);

    expect(onboarding.isOnboarding).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });
});

describe('handleCallback', () => {
  it('acknowledges the tap and submits the parsed literal value', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const answerCallbackQuery = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding({
      submitAnswer: vi
        .fn()
        .mockResolvedValue({ status: AnswerStatus.NEXT, question: QUESTIONS[Field.HEIGHT_CM] }),
    });
    const { deps } = makeDeps(onboarding);

    await handleCallback(
      { callbackQuery: { data: 'onb:sex:male' }, chat: { id: 9 }, reply, answerCallbackQuery },
      deps,
    );

    expect(answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(onboarding.submitAnswer).toHaveBeenCalledWith(9n, 'male');
  });

  it('ignores callback data that is not its own', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const answerCallbackQuery = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding();
    const { deps } = makeDeps(onboarding);

    await handleCallback(
      { callbackQuery: { data: 'other:thing' }, chat: { id: 9 }, reply, answerCallbackQuery },
      deps,
    );

    expect(answerCallbackQuery).not.toHaveBeenCalled();
    expect(onboarding.submitAnswer).not.toHaveBeenCalled();
  });
});
