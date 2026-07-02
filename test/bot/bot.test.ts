import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import {
  createBot,
  handleBotError,
  handleCallback,
  handleDone,
  handlePhoto,
  handleProgressCommand,
  handleStart,
  handleText,
  type ErrorContext,
} from '../../src/bot/bot.js';
import type { PhotoContext } from '../../src/bot/types.js';
import type { BotDeps } from '../../src/bot/types.js';
import { createMediaGroupBuffer, type Schedule } from '../../src/bot/mediaGroup.js';
import type { ClarifyStore } from '../../src/clarify/store.js';
import type { OpenQuestion } from '../../src/clarify/types.js';
import type { FoodService, ResolvedFood } from '../../src/food/types.js';
import type { MetricsService } from '../../src/metrics/types.js';
import { QUESTIONS } from '../../src/onboarding/questions.js';
import { AnswerStatus, Field, type OnboardingService } from '../../src/onboarding/types.js';
import type { ProgressStore } from '../../src/progress/store.js';
import type { ProgressService } from '../../src/progress/types.js';
import type { QueryService } from '../../src/query/types.js';
import type { ReviewService } from '../../src/reviews/types.js';

// fs write-path spies for the CRITICAL image-never-persisted test (invariant #4) at the layer that
// actually materializes the Telegram bytes — `downloadPhotoBase64` in bot.ts. ESM namespaces aren't
// spy-able after import, so the write functions are mocked at module scope; a full handlePhoto run
// (download → base64 → logPhoto) must call none of them.
const { fsWriteFile, fsWriteFileSync, fsCreateWriteStream, fspWriteFile } = vi.hoisted(() => ({
  fsWriteFile: vi.fn(),
  fsWriteFileSync: vi.fn(),
  fsCreateWriteStream: vi.fn(),
  fspWriteFile: vi.fn(),
}));
vi.mock('node:fs', async (importActual) => {
  const actual = await importActual<Record<string, unknown>>();
  return {
    ...actual,
    writeFile: fsWriteFile,
    writeFileSync: fsWriteFileSync,
    createWriteStream: fsCreateWriteStream,
  };
});
vi.mock('node:fs/promises', async (importActual) => {
  const actual = await importActual<Record<string, unknown>>();
  return { ...actual, writeFile: fspWriteFile };
});

// A fresh in-memory clarify store per test (mirrors the module singleton's set/peek/take contract)
// so pending-question state never leaks between cases.
const makeClarify = (initial: [bigint, OpenQuestion][] = []): ClarifyStore => {
  const map = new Map<bigint, OpenQuestion>(initial);
  return {
    set: (chatId, question) => void map.set(chatId, question),
    peek: (chatId) => map.get(chatId) ?? null,
    take: (chatId) => {
      const question = map.get(chatId) ?? null;
      map.delete(chatId);
      return question;
    },
  };
};

const resolvedStub = (): ResolvedFood => ({
  name: 'творог',
  per: 'per100g',
  base: { kcal: 100, proteinG: 16, fatG: 5, carbsG: 3 },
  qty: 100,
  unit: 'g',
  source: 'estimate',
  foodDbId: null,
});

const pendingStub = (askedAt: Date): OpenQuestion => ({
  variant: 'text',
  resolved: resolvedStub(),
  parsed: { product: 'творог', qty: undefined, unit: '' },
  clarification: {
    kind: 'descriptor',
    unknown: 'fat%',
    question: 'Какой жирности?',
    options: [
      { label: '5%', value: '5%' },
      { label: '9%', value: '9%' },
    ],
  },
  meal: 'lunch',
  date: '2026-06-30',
  askedAt,
});

// A pending PHOTO Open Question — holds an item LIST, no `parsed`, no image (design D1).
const photoPendingStub = (askedAt: Date): OpenQuestion => ({
  variant: 'photo',
  items: [resolvedStub()],
  caption: 'салат',
  clarification: {
    kind: 'descriptor',
    unknown: 'dressing',
    question: 'Салат с заправкой?',
    options: [
      { label: 'yes', value: 'yes' },
      { label: 'no', value: 'no' },
    ],
  },
  meal: 'lunch',
  date: '2026-06-30',
  askedAt,
});

const makeOnboarding = (over: Partial<OnboardingService> = {}): OnboardingService => ({
  startSession: vi.fn().mockResolvedValue({ question: QUESTIONS[Field.AGE] }),
  submitAnswer: vi
    .fn()
    .mockResolvedValue({ status: AnswerStatus.NEXT, question: QUESTIONS[Field.SEX] }),
  isOnboarding: vi.fn().mockResolvedValue(false),
  ...over,
});

const makeFood = (over: Partial<FoodService> = {}): FoodService => ({
  logFood: vi.fn().mockResolvedValue({
    kind: 'logged',
    confirmation: { text: 'Записал: тест — 100 ккал · Б 1 / Ж 1 / У 1 г.' },
  }),
  logPhoto: vi.fn().mockResolvedValue({
    kind: 'logged',
    confirmation: { text: 'Записал:\n• тест — 100 ккал · Б 1 / Ж 1 / У 1 г.' },
  }),
  saveToCatalog: vi.fn().mockResolvedValue({ saved: true, entryName: 'тест' }),
  correctLast: vi
    .fn()
    .mockResolvedValue({ text: 'Исправил: тест — 150 ккал · Б 1 / Ж 1 / У 1 г.' }),
  resolveAnswer: vi
    .fn()
    .mockResolvedValue({ text: 'Записал: творог 5% — 121 ккал · Б 16 / Ж 5 / У 3 г.' }),
  logExpiredEstimate: vi.fn().mockResolvedValue(undefined),
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

const makeReviews = (over: Partial<ReviewService> = {}): ReviewService => ({
  generateDaily: vi.fn().mockResolvedValue({ text: 'Ревью дня — 24.06.2026', rollups: [] }),
  ...over,
});

const makeProgress = (over: Partial<ProgressService> = {}): ProgressService => ({
  analyzeAndSave: vi.fn().mockResolvedValue({ text: 'Живот в профиль стал заметно площе.' }),
  ...over,
});

// A fresh in-memory arming store per test (mirrors the module singleton's arm/take contract).
const makeProgressArm = (armed: bigint[] = []): ProgressStore => {
  const map = new Map<bigint, Date>(armed.map((id) => [id, new Date()]));
  return {
    arm: (chatId) => void map.set(chatId, new Date()),
    take: (chatId) => {
      const at = map.get(chatId) ?? null;
      map.delete(chatId);
      return at;
    },
  };
};

const makeDeps = (
  onboarding: OnboardingService,
  intent = 'query',
  food: FoodService = makeFood(),
  metrics: MetricsService = makeMetrics(),
  query: QueryService = makeQuery(),
  clarify: ClarifyStore = makeClarify(),
  progress: ProgressService = makeProgress(),
  progressArm: ProgressStore = makeProgressArm(),
  reviews: ReviewService = makeReviews(),
): {
  deps: BotDeps;
  create: ReturnType<typeof vi.fn>;
  food: FoodService;
  metrics: MetricsService;
  query: QueryService;
  clarify: ClarifyStore;
  progress: ProgressService;
  progressArm: ProgressStore;
  reviews: ReviewService;
} => {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ intent, date: 'today' }) }],
    usage: {},
  });
  const anthropic = { messages: { create } } as unknown as Anthropic;
  return {
    deps: {
      anthropic,
      userTz: 'Europe/Kyiv',
      onboarding,
      food,
      metrics,
      query,
      reviews,
      clarify,
      progress,
      progressArm,
      // Real buffer with the default (immediate) path for lone photos — the media-group debounce is
      // exercised directly in test/bot/mediaGroup.test.ts with an injected clock.
      foodBuffer: createMediaGroupBuffer(),
    },
    create,
    food,
    metrics,
    query,
    clarify,
    progress,
    progressArm,
    reviews,
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
    const { deps, create, reviews } = makeDeps(onboarding, 'review_trigger');

    await handleText({ message: { text: 'как там моя неделя?' }, chat: { id: 7 }, reply }, deps);

    expect(onboarding.submitAnswer).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
    // A `review_trigger` classification generates today's daily review, mirroring the trigger text.
    expect(reviews.generateDaily).toHaveBeenCalledWith(7n, { triggerText: 'как там моя неделя?' });
    expect(String(reply.mock.calls[0]?.[0])).toContain('Ревью дня');
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
        kind: 'logged',
        confirmation: {
          text: 'Записал: курица — 330 ккал',
          addToCatalog: { id: 5, label: '➕ В базу продуктов' },
        },
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

  it('stores the Open Question and poses it (with a keyboard) on a `log` ask outcome', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding({ isOnboarding: vi.fn().mockResolvedValue(false) });
    const pendingRecord = pendingStub(new Date());
    const food = makeFood({
      logFood: vi.fn().mockResolvedValue({
        kind: 'ask',
        question: { text: 'Какой жирности творог?', options: ['0%', '5%', '9%'] },
        pending: pendingRecord,
      }),
    });
    const clarify = makeClarify();
    const { deps } = makeDeps(onboarding, 'log', food, makeMetrics(), makeQuery(), clarify);

    await handleText({ message: { text: 'творог' }, chat: { id: 7 }, reply }, deps);

    expect(clarify.peek(7n)).toBe(pendingRecord); // held for the next message
    expect(String(reply.mock.calls[0]?.[0])).toContain('жирности');
    expect(reply.mock.calls[0]?.[1]).toHaveProperty('reply_markup'); // inline keyboard
    expect(food.resolveAnswer).not.toHaveBeenCalled();
  });

  it('resolves a pending question on a fresh `answer` and clears it (classified with the flag)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding({ isOnboarding: vi.fn().mockResolvedValue(false) });
    const clarify = makeClarify([[7n, pendingStub(new Date())]]);
    const food = makeFood();
    const { deps, create } = makeDeps(
      onboarding,
      'answer',
      food,
      makeMetrics(),
      makeQuery(),
      clarify,
    );

    await handleText({ message: { text: '5%' }, chat: { id: 7 }, reply }, deps);

    // The router is asked WITH the pending flag so `answer` is selectable — and only the current
    // message is sent (no chat history, invariant #1).
    const routerArgs = create.mock.calls[0]?.[0] as { messages: { content: string }[] };
    expect(routerArgs.messages).toHaveLength(1);
    expect(routerArgs.messages[0]?.content).toBe('5%');
    expect(food.resolveAnswer).toHaveBeenCalledWith(
      7n,
      expect.objectContaining({ date: '2026-06-30' }),
      '5%',
    );
    expect(clarify.peek(7n)).toBeNull(); // cleared
    expect(food.logExpiredEstimate).not.toHaveBeenCalled();
    expect(String(reply.mock.calls[0]?.[0])).toContain('творог');
  });

  it('falls back to the estimate on a NON-answer while pending, then routes the new message fresh', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding({ isOnboarding: vi.fn().mockResolvedValue(false) });
    const clarify = makeClarify([[7n, pendingStub(new Date())]]);
    const food = makeFood();
    const metrics = makeMetrics();
    const { deps } = makeDeps(onboarding, 'metric', food, metrics, makeQuery(), clarify);

    await handleText({ message: { text: 'вес 89.2' }, chat: { id: 7 }, reply }, deps);

    expect(food.logExpiredEstimate).toHaveBeenCalledWith(
      7n,
      expect.objectContaining({ date: '2026-06-30' }),
    );
    expect(food.resolveAnswer).not.toHaveBeenCalled(); // the new message is NOT consumed as the answer
    expect(clarify.peek(7n)).toBeNull();
    expect(metrics.logMetric).toHaveBeenCalled(); // handled fresh
  });

  it('falls back to the estimate when the pending question has expired, then routes fresh', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding({ isOnboarding: vi.fn().mockResolvedValue(false) });
    const expired = pendingStub(new Date(Date.now() - 60 * 60 * 1000)); // an hour old > 10 min TTL
    const clarify = makeClarify([[7n, expired]]);
    const food = makeFood();
    const metrics = makeMetrics();
    const { deps, create } = makeDeps(onboarding, 'metric', food, metrics, makeQuery(), clarify);

    await handleText({ message: { text: 'вес 89.2' }, chat: { id: 7 }, reply }, deps);

    expect(food.logExpiredEstimate).toHaveBeenCalledWith(7n, expired); // never drop the entry (#3)
    expect(clarify.peek(7n)).toBeNull();
    expect(metrics.logMetric).toHaveBeenCalled();
    // The classifier is called once, fresh — NOT with the pending flag (the question is gone).
    expect(create).toHaveBeenCalledTimes(1);
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

  it('resolves the pending question from a `q:<index>` tap (mapped to the option value) and clears it', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const answerCallbackQuery = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding();
    const clarify = makeClarify([[9n, pendingStub(new Date())]]);
    const food = makeFood();
    const { deps } = makeDeps(onboarding, 'query', food, makeMetrics(), makeQuery(), clarify);

    // `q:0` indexes the first stored option; its English value ('5%') is what resolution acts on —
    // the callback_data never carries the (possibly oversized Cyrillic) value itself (W2 fix).
    await handleCallback(
      { callbackQuery: { data: 'q:0' }, chat: { id: 9 }, reply, answerCallbackQuery },
      deps,
    );

    expect(answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(food.resolveAnswer).toHaveBeenCalledWith(
      9n,
      expect.objectContaining({ date: '2026-06-30' }),
      '5%',
    );
    expect(clarify.peek(9n)).toBeNull();
    expect(onboarding.submitAnswer).not.toHaveBeenCalled();
  });

  it('acknowledges and ignores a stale `q:` tap with no pending question (guard)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const answerCallbackQuery = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding();
    const food = makeFood();
    const { deps } = makeDeps(onboarding, 'query', food, makeMetrics(), makeQuery(), makeClarify());

    await handleCallback(
      { callbackQuery: { data: 'q:5%' }, chat: { id: 9 }, reply, answerCallbackQuery },
      deps,
    );

    expect(answerCallbackQuery).toHaveBeenCalledTimes(1); // acknowledged
    expect(food.resolveAnswer).not.toHaveBeenCalled(); // nothing to resolve
    expect(reply).not.toHaveBeenCalled();
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

// A fake photo ctx: getFile yields a path, ctx.api.token builds the endpoint. Global fetch is stubbed
// so the download stays in memory (invariant #4) — no real network, no disk.
const makePhotoCtx = (
  caption: string | undefined,
  reply: ReturnType<typeof vi.fn>,
  getFile = vi.fn().mockResolvedValue({ file_path: 'photos/file_1.jpg' }),
): PhotoContext => ({
  message: { photo: [{ file_id: 'small' }, { file_id: 'largest' }], caption },
  chat: { id: 7 },
  reply: reply as PhotoContext['reply'],
  getFile,
  api: { token: 'BOT_TOKEN' },
});

describe('handlePhoto', () => {
  it('downloads the largest photo to base64 in memory and logs it via the food service', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const onboarding = makeOnboarding();
    const food = makeFood();
    const { deps } = makeDeps(onboarding, 'query', food);
    const getFile = vi.fn().mockResolvedValue({ file_path: 'photos/file_1.jpg' });
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));

    await handlePhoto(makePhotoCtx('куриное филе', reply, getFile), deps);

    expect(getFile).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.telegram.org/file/botBOT_TOKEN/photos/file_1.jpg',
    );
    const call = (food.logPhoto as ReturnType<typeof vi.fn>).mock.calls[0] as
      [bigint, string, string[]] | undefined;
    expect(call?.[0]).toBe(7n);
    expect(call?.[1]).toBe('куриное филе');
    expect(call?.[2]).toEqual([Buffer.from([1, 2, 3]).toString('base64')]); // one-element group
    expect(reply).toHaveBeenCalledWith('Записал:\n• тест — 100 ккал · Б 1 / Ж 1 / У 1 г.');

    fetchSpy.mockRestore();
  });

  it('stores the photo Open Question and poses it (inline keyboard) on a plate `ask` outcome', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const pendingRecord = photoPendingStub(new Date());
    const food = makeFood({
      logPhoto: vi.fn().mockResolvedValue({
        kind: 'ask',
        question: {
          text: 'Салат с заправкой?',
          options: [
            { label: 'yes', value: 'yes' },
            { label: 'no', value: 'no' },
          ],
        },
        pending: pendingRecord,
      }),
    });
    const clarify = makeClarify();
    const { deps } = makeDeps(makeOnboarding(), 'query', food, makeMetrics(), makeQuery(), clarify);
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));

    await handlePhoto(makePhotoCtx('салат', reply), deps);

    expect(clarify.peek(7n)).toBe(pendingRecord); // held for the next message (photo variant)
    expect(String(reply.mock.calls[0]?.[0])).toContain('заправк');
    expect(reply.mock.calls[0]?.[1]).toHaveProperty('reply_markup'); // inline keyboard
    fetchSpy.mockRestore();
  });

  it('resolves a pending photo question via a `q:<index>` tap and a free-text answer alike', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const answerCallbackQuery = vi.fn().mockResolvedValue(undefined);
    const food = makeFood();

    // A tap: q:1 → the stored option value 'no' resolves through the SAME service path as text.
    const tapClarify = makeClarify([[9n, photoPendingStub(new Date())]]);
    const tapDeps = makeDeps(
      makeOnboarding(),
      'query',
      food,
      makeMetrics(),
      makeQuery(),
      tapClarify,
    );
    await handleCallback(
      { callbackQuery: { data: 'q:1' }, chat: { id: 9 }, reply, answerCallbackQuery },
      tapDeps.deps,
    );
    expect(food.resolveAnswer).toHaveBeenCalledWith(
      9n,
      expect.objectContaining({ variant: 'photo' }),
      'no',
    );
    expect(tapClarify.peek(9n)).toBeNull(); // cleared

    // Free text: routed as `answer` while the photo question is pending → resolveAnswer with the text.
    const textClarify = makeClarify([[7n, photoPendingStub(new Date())]]);
    const textDeps = makeDeps(
      makeOnboarding(),
      'answer',
      food,
      makeMetrics(),
      makeQuery(),
      textClarify,
    );
    await handleText({ message: { text: 'с маслом' }, chat: { id: 7 }, reply }, textDeps.deps);
    expect(food.resolveAnswer).toHaveBeenCalledWith(
      7n,
      expect.objectContaining({ variant: 'photo' }),
      'с маслом',
    );
    expect(textClarify.peek(7n)).toBeNull();
  });

  it('passes an empty caption when the photo has none', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const food = makeFood();
    const { deps } = makeDeps(makeOnboarding(), 'query', food);
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(new Uint8Array([9])));

    await handlePhoto(makePhotoCtx(undefined, reply), deps);

    expect((food.logPhoto as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]).toBe('');
    fetchSpy.mockRestore();
  });

  it('skips the photo while onboarding is incomplete (no download, no log)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const food = makeFood();
    const onboarding = makeOnboarding({ isOnboarding: vi.fn().mockResolvedValue(true) });
    const { deps } = makeDeps(onboarding, 'query', food);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const getFile = vi.fn();

    await handlePhoto(makePhotoCtx('plate', reply, getFile), deps);

    expect(getFile).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(food.logPhoto).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('stays silent when the file has no path (nothing to download)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const food = makeFood();
    const { deps } = makeDeps(makeOnboarding(), 'query', food);
    const getFile = vi.fn().mockResolvedValue({});
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await handlePhoto(makePhotoCtx('plate', reply, getFile), deps);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(food.logPhoto).not.toHaveBeenCalled();
    expect(reply).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('never base64s an error body: a non-2xx file endpoint skips the log (no vision call)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const food = makeFood();
    const { deps } = makeDeps(makeOnboarding(), 'query', food);
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('Not Found', { status: 404 }));

    await handlePhoto(makePhotoCtx('plate', reply), deps);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(food.logPhoto).not.toHaveBeenCalled();
    expect(reply).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  // A photo ctx that belongs to a Telegram media group (shares media_group_id across its updates).
  const makeGroupPhotoCtx = (
    mediaGroupId: string | undefined,
    caption: string | undefined,
    reply: ReturnType<typeof vi.fn>,
  ): PhotoContext => ({
    message: {
      photo: [{ file_id: 'small' }, { file_id: 'largest' }],
      caption,
      media_group_id: mediaGroupId,
    },
    chat: { id: 7 },
    reply: reply as PhotoContext['reply'],
    getFile: vi.fn().mockResolvedValue({ file_path: 'photos/file.jpg' }),
    api: { token: 'BOT_TOKEN' },
  });

  const flushMicrotasks = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

  it('buffers a media group and flushes ONE logPhoto over all images + the single caption, writing NOTHING to disk (invariants #5/#4)', async () => {
    // CRITICAL (invariant #4) across the N-image buffered path: clear the fs write spies up front so
    // the post-flush assertions are genuinely about THIS 3-photo group's download+buffer+flush run.
    fsWriteFile.mockClear();
    fsWriteFileSync.mockClear();
    fsCreateWriteStream.mockClear();
    fspWriteFile.mockClear();

    const reply = vi.fn().mockResolvedValue(undefined);
    const food = makeFood();
    const { deps } = makeDeps(makeOnboarding(), 'query', food);
    // Drive the debounce with an injected clock — no real timers.
    let tasks: { fn: () => void }[] = [];
    const schedule: Schedule = (fn) => {
      const task = { fn };
      tasks.push(task);
      return () => {
        tasks = tasks.filter((t) => t !== task);
      };
    };
    deps.foodBuffer = createMediaGroupBuffer(schedule, 400);
    // Distinct bytes per photo so the buffered images differ.
    const bytes = [[1], [2], [3]];
    let call = 0;
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(new Response(new Uint8Array(bytes[call++] ?? [0]))),
      );

    // Three photos of one group; the caption rides only the first.
    await handlePhoto(makeGroupPhotoCtx('grp', 'protein 25g, 1 tsp sugar', reply), deps);
    await handlePhoto(makeGroupPhotoCtx('grp', undefined, reply), deps);
    await handlePhoto(makeGroupPhotoCtx('grp', undefined, reply), deps);

    expect(food.logPhoto).not.toHaveBeenCalled(); // still buffering
    tasks.forEach((t) => t.fn()); // debounce elapses
    await flushMicrotasks();

    expect(food.logPhoto).toHaveBeenCalledTimes(1); // ONE log for the whole group
    const args = (food.logPhoto as ReturnType<typeof vi.fn>).mock.calls[0] as [
      bigint,
      string,
      string[],
    ];
    expect(args[0]).toBe(7n);
    expect(args[1]).toBe('protein 25g, 1 tsp sugar'); // the group's single caption
    expect(args[2]).toEqual(bytes.map((b) => Buffer.from(b).toString('base64'))); // all three images
    expect(reply).toHaveBeenCalledTimes(1); // one reply for the group

    // None of the three downloaded images touched any fs write path across the buffered flush.
    expect(fsWriteFile).not.toHaveBeenCalled();
    expect(fsWriteFileSync).not.toHaveBeenCalled();
    expect(fsCreateWriteStream).not.toHaveBeenCalled();
    expect(fspWriteFile).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('a progress photo NEVER enters the food buffer (routed before buffering, invariant D3)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const food = makeFood();
    const progress = makeProgress();
    const { deps } = makeDeps(
      makeOnboarding(),
      'query',
      food,
      makeMetrics(),
      makeQuery(),
      makeClarify(),
      progress,
    );
    const addSpy = vi.spyOn(deps.foodBuffer, 'add');
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));

    // Even inside a media group, a progress-captioned photo bypasses the food buffer entirely.
    await handlePhoto(makeGroupPhotoCtx('grp', 'мой прогресс', reply), deps);

    expect(progress.analyzeAndSave).toHaveBeenCalledTimes(1);
    expect(addSpy).not.toHaveBeenCalled(); // never buffered
    expect(food.logPhoto).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('CRITICAL — writes nothing to disk across the download+log path (invariant #4)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const food = makeFood();
    const { deps } = makeDeps(makeOnboarding(), 'query', food);
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));

    await handlePhoto(makePhotoCtx('куриное филе', reply), deps);

    // the byte-materializing layer (downloadPhotoBase64) must touch no fs write path
    expect(fsWriteFile).not.toHaveBeenCalled();
    expect(fsWriteFileSync).not.toHaveBeenCalled();
    expect(fsCreateWriteStream).not.toHaveBeenCalled();
    expect(fspWriteFile).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('replies a language-mirrored apology when a grouped flush throws (never silently swallowed)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    // The detached flush's logPhoto throws — it runs off the update loop so bot.catch can't see it;
    // flushFoodGroup must own the boundary and still apologize (mirrors the single-photo path).
    const food = makeFood({ logPhoto: vi.fn().mockRejectedValue(new Error('vision seam down')) });
    const { deps } = makeDeps(makeOnboarding(), 'query', food);
    let tasks: { fn: () => void }[] = [];
    const schedule: Schedule = (fn) => {
      const task = { fn };
      tasks.push(task);
      return () => {
        tasks = tasks.filter((t) => t !== task);
      };
    };
    deps.foodBuffer = createMediaGroupBuffer(schedule, 400);
    // A fresh Response per call — a Response body can only be read once.
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(new Response(new Uint8Array([1]))));

    await handlePhoto(makeGroupPhotoCtx('grp', 'мой обед', reply), deps);
    await handlePhoto(makeGroupPhotoCtx('grp', undefined, reply), deps);
    tasks.forEach((t) => t.fn()); // debounce elapses → the detached flush runs and throws
    await flushMicrotasks();

    expect(food.logPhoto).toHaveBeenCalledTimes(1);
    expect(reply).toHaveBeenCalledTimes(1); // the apology, not silence
    expect(String(reply.mock.calls[0]?.[0])).toContain('не так'); // language-mirrored "went wrong"
    fetchSpy.mockRestore();
  });
});

describe('progress-photo routing (US-8)', () => {
  it('/progress arms the next photo and replies with an instruction', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const progressArm = makeProgressArm();
    const armSpy = vi.spyOn(progressArm, 'arm');
    const { deps } = makeDeps(
      makeOnboarding(),
      'query',
      makeFood(),
      makeMetrics(),
      makeQuery(),
      makeClarify(),
      makeProgress(),
      progressArm,
    );

    await handleProgressCommand({ chat: { id: 7 }, reply }, deps);

    expect(armSpy).toHaveBeenCalledWith(7n);
    expect(reply).toHaveBeenCalledTimes(1);
    expect(String(reply.mock.calls[0]?.[0]).length).toBeGreaterThan(0);
  });

  it("handleDone generates today's daily review (no trigger text → Russian default) and replies", async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const reviews = makeReviews();
    const { deps } = makeDeps(
      makeOnboarding(),
      'log',
      makeFood(),
      makeMetrics(),
      makeQuery(),
      makeClarify(),
      makeProgress(),
      makeProgressArm(),
      reviews,
    );

    await handleDone({ chat: { id: 7 }, reply }, deps);

    expect(reviews.generateDaily).toHaveBeenCalledWith(7n);
    expect(String(reply.mock.calls[0]?.[0])).toContain('Ревью дня');
  });

  it('handleDone delivers a rollup alongside the daily (each as its own reply, in order)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const reviews = makeReviews({
      generateDaily: vi.fn().mockResolvedValue({
        text: 'Ревью дня — 05.07.2026',
        rollups: ['Ревью недели — 29.06 – 05.07.2026'],
      }),
    });
    const { deps } = makeDeps(
      makeOnboarding(),
      'log',
      makeFood(),
      makeMetrics(),
      makeQuery(),
      makeClarify(),
      makeProgress(),
      makeProgressArm(),
      reviews,
    );

    await handleDone({ chat: { id: 7 }, reply }, deps);

    expect(reply).toHaveBeenCalledTimes(2);
    expect(String(reply.mock.calls[0]?.[0])).toContain('Ревью дня');
    expect(String(reply.mock.calls[1]?.[0])).toContain('Ревью недели');
  });

  it('routes a captioned progress photo to the progress service, not logPhoto', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const food = makeFood();
    const progress = makeProgress();
    const { deps } = makeDeps(
      makeOnboarding(),
      'query',
      food,
      makeMetrics(),
      makeQuery(),
      makeClarify(),
      progress,
    );
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));

    await handlePhoto(makePhotoCtx('мой прогресс', reply), deps);

    expect(progress.analyzeAndSave).toHaveBeenCalledWith(
      7n,
      'мой прогресс',
      Buffer.from([1, 2, 3]).toString('base64'),
    );
    expect(food.logPhoto).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith('Живот в профиль стал заметно площе.');
    fetchSpy.mockRestore();
  });

  it('CRITICAL — writes nothing to disk across the progress route (invariant #4)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const progress = makeProgress();
    const { deps } = makeDeps(
      makeOnboarding(),
      'query',
      makeFood(),
      makeMetrics(),
      makeQuery(),
      makeClarify(),
      progress,
    );
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));

    await handlePhoto(makePhotoCtx('мой прогресс', reply), deps);

    // the progress route materializes bytes (download → base64) then hands them to the service —
    // no fs write path is touched (the service-level fs-spy covers analyze → save; this covers the
    // download half on the progress route, so the union spans the full download → analyze → save run)
    expect(progress.analyzeAndSave).toHaveBeenCalled();
    expect(fsWriteFile).not.toHaveBeenCalled();
    expect(fsWriteFileSync).not.toHaveBeenCalled();
    expect(fsCreateWriteStream).not.toHaveBeenCalled();
    expect(fspWriteFile).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('routes an armed uncaptioned photo to the progress service', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const food = makeFood();
    const progress = makeProgress();
    const progressArm = makeProgressArm([7n]); // /progress already armed chat 7
    const { deps } = makeDeps(
      makeOnboarding(),
      'query',
      food,
      makeMetrics(),
      makeQuery(),
      makeClarify(),
      progress,
      progressArm,
    );
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));

    await handlePhoto(makePhotoCtx(undefined, reply), deps);

    expect(progress.analyzeAndSave).toHaveBeenCalledTimes(1);
    expect(food.logPhoto).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('an unarmed uncaptioned photo still routes to logPhoto (food default)', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const food = makeFood();
    const progress = makeProgress();
    const { deps } = makeDeps(
      makeOnboarding(),
      'query',
      food,
      makeMetrics(),
      makeQuery(),
      makeClarify(),
      progress,
    );
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));

    await handlePhoto(makePhotoCtx(undefined, reply), deps);

    expect(food.logPhoto).toHaveBeenCalledTimes(1);
    expect(progress.analyzeAndSave).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('an expired arming flag falls back to the food path', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const food = makeFood();
    const progress = makeProgress();
    // An armed-at an hour ago (> 10 min TTL) → expired.
    const progressArm: ProgressStore = {
      arm: vi.fn(),
      take: vi.fn().mockReturnValue(new Date(Date.now() - 60 * 60 * 1000)),
    };
    const { deps } = makeDeps(
      makeOnboarding(),
      'query',
      food,
      makeMetrics(),
      makeQuery(),
      makeClarify(),
      progress,
      progressArm,
    );
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));

    await handlePhoto(makePhotoCtx(undefined, reply), deps);

    expect(food.logPhoto).toHaveBeenCalledTimes(1);
    expect(progress.analyzeAndSave).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('consumes the arming flag on every photo so a stray /progress cannot reroute a later food photo', async () => {
    const reply = vi.fn().mockResolvedValue(undefined);
    const food = makeFood();
    const progress = makeProgress();
    const progressArm = makeProgressArm([7n]);
    const takeSpy = vi.spyOn(progressArm, 'take');
    const { deps } = makeDeps(
      makeOnboarding(),
      'query',
      food,
      makeMetrics(),
      makeQuery(),
      makeClarify(),
      progress,
      progressArm,
    );
    // A fresh Response per call — a body can only be read once.
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => Promise.resolve(new Response(new Uint8Array([1, 2, 3]))));

    // First photo consumes the flag → progress.
    await handlePhoto(makePhotoCtx(undefined, reply), deps);
    // Second photo: flag already gone → food.
    await handlePhoto(makePhotoCtx(undefined, reply), deps);

    expect(takeSpy).toHaveBeenCalledTimes(2); // consumed on both
    expect(progress.analyzeAndSave).toHaveBeenCalledTimes(1); // only the first
    expect(food.logPhoto).toHaveBeenCalledTimes(1); // the second
    fetchSpy.mockRestore();
  });
});

// Global update-error boundary (design D1). The boundary logs the error message-only (invariant #9),
// makes a best-effort language-mirrored apology, and swallows a failing apology — the poller lives on.
describe('handleBotError', () => {
  const makeCtx = (
    inbound: { text?: string; caption?: string } | undefined,
    reply = vi.fn().mockResolvedValue(undefined),
  ): { ctx: ErrorContext; reply: ReturnType<typeof vi.fn> } => ({
    ctx: { message: inbound, reply },
    reply,
  });

  it('logs the error message-only and never rethrows (poller survives)', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ctx } = makeCtx({ text: 'борщ 300г' });

    await expect(handleBotError(new Error('DB timeout'), ctx)).resolves.toBeUndefined();

    const logged = errorLog.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('DB timeout');
    expect(logged).not.toContain('борщ'); // no user content in the log (invariant #9)
    errorLog.mockRestore();
  });

  it('replies in the inbound language (Russian message → Russian apology)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ctx, reply } = makeCtx({ text: 'съел борщ' });

    await handleBotError(new Error('boom'), ctx);

    expect(reply).toHaveBeenCalledTimes(1);
    expect(reply.mock.calls[0]?.[0]).toBe('Что-то пошло не так. Попробуй ещё раз.');
  });

  it('replies in Ukrainian for a Ukrainian inbound message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ctx, reply } = makeCtx({ text: 'зʼїв борщ, ще їстиму' });

    await handleBotError(new Error('boom'), ctx);

    expect(reply.mock.calls[0]?.[0]).toBe('Щось пішло не так. Спробуй ще раз.');
  });

  it('defaults to Russian when there is no inbound text (design D6 precedent)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { ctx, reply } = makeCtx(undefined);

    await handleBotError(new Error('boom'), ctx);

    expect(reply.mock.calls[0]?.[0]).toBe('Что-то пошло не так. Попробуй ещё раз.');
  });

  it('swallows a failing error-reply (Telegram unreachable) — logged, not rethrown', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const reply = vi.fn().mockRejectedValue(new Error('network down'));
    const { ctx } = makeCtx({ text: 'hi' }, reply);

    await expect(handleBotError(new Error('handler boom'), ctx)).resolves.toBeUndefined();

    const logged = errorLog.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('network down');
    errorLog.mockRestore();
  });
});

describe('createBot', () => {
  it('registers a global error boundary so a throwing handler cannot kill the poller', () => {
    const bot = createBot('123456:test-token', makeDeps(makeOnboarding()).deps);
    // grammY replaces the default (rethrowing) errorHandler once `bot.catch` is wired.
    expect(typeof bot.errorHandler).toBe('function');
  });
});
