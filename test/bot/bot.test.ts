import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { handleCallback, handleStart, handleText } from '../../src/bot/bot.js';
import type { BotDeps } from '../../src/bot/types.js';
import { QUESTIONS } from '../../src/onboarding/questions.js';
import { AnswerStatus, Field, type OnboardingService } from '../../src/onboarding/types.js';

const makeOnboarding = (over: Partial<OnboardingService> = {}): OnboardingService => ({
  startSession: vi.fn().mockResolvedValue({ question: QUESTIONS[Field.AGE] }),
  submitAnswer: vi
    .fn()
    .mockResolvedValue({ status: AnswerStatus.NEXT, question: QUESTIONS[Field.SEX] }),
  isOnboarding: vi.fn().mockResolvedValue(false),
  ...over,
});

const makeDeps = (
  onboarding: OnboardingService,
  intent = 'query',
): { deps: BotDeps; create: ReturnType<typeof vi.fn> } => {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ intent, date: 'today' }) }],
    usage: {},
  });
  const anthropic = { messages: { create } } as unknown as Anthropic;
  return { deps: { anthropic, userTz: 'Europe/Kyiv', onboarding }, create };
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
    const { deps, create } = makeDeps(onboarding, 'query');

    await handleText({ message: { text: 'сколько белка?' }, chat: { id: 7 }, reply }, deps);

    expect(onboarding.submitAnswer).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
    expect(String(reply.mock.calls[0]?.[0])).toContain('query');
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
