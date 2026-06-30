import { Bot, InlineKeyboard } from 'grammy';
import { classifyMessage } from '../router/router.js';
import {
  AnswerStatus,
  QuestionKind,
  type AnswerResult,
  type Question,
  type Targets,
} from '../onboarding/types.js';
import type { BotDeps, CallbackContext, ReplyFn, StartContext, TextContext } from './types.js';

// Callback data is namespaced `onb:<field>:<value>` so the handler tells its own buttons apart.
const CALLBACK_PREFIX = 'onb:';
const WELCOME = 'Привіт! Я твій тренер з харчування. Налаштуймо твій профіль — кілька запитань.';

const buildKeyboard = (question: Question): InlineKeyboard => {
  const kb = new InlineKeyboard();
  for (const opt of question.options ?? []) {
    kb.text(opt.label, `${CALLBACK_PREFIX}${question.field}:${opt.value}`).row();
  }
  return kb;
};

const askQuestion = async (reply: ReplyFn, question: Question): Promise<void> => {
  if (question.kind === QuestionKind.CHOICE) {
    await reply(question.prompt, { reply_markup: buildKeyboard(question) });
    return;
  }
  await reply(question.prompt);
};

const targetsMessage = (t: Targets): string =>
  [
    'Готово! Твої цілі на день:',
    `• Калорії: ${t.kcal} ккал`,
    `• Білки: ${t.proteinG} г`,
    `• Жири: ${t.fatG} г`,
    `• Вуглеводи: ${t.carbsG} г`,
  ].join('\n');

// Spec: an invalid answer must "explain the expected input" — surface the numeric range, not a bare
// retry. Choice questions re-show their keyboard, so a generic nudge suffices there.
const invalidHint = (question: Question): string =>
  question.kind === QuestionKind.NUMERIC && question.range
    ? `Не зрозумів. Введи число від ${question.range.min} до ${question.range.max}.`
    : 'Не зрозумів відповідь. Обери один із варіантів нижче.';

const respondToAnswer = async (reply: ReplyFn, result: AnswerResult): Promise<void> => {
  if (result.status === AnswerStatus.INVALID) {
    await reply(invalidHint(result.question));
    await askQuestion(reply, result.question);
    return;
  }
  if (result.status === AnswerStatus.NEXT) {
    await askQuestion(reply, result.question);
    return;
  }
  await reply(targetsMessage(result.targets));
};

/** `/start`: find-or-create the user, resume at the first unanswered question, or greet with targets. */
export const handleStart = async (ctx: StartContext, deps: BotDeps): Promise<void> => {
  if (!ctx.chat) {
    return;
  }
  const { question, targets } = await deps.onboarding.startSession(BigInt(ctx.chat.id));
  if (question === null) {
    await ctx.reply(targets ? targetsMessage(targets) : 'Ти вже налаштований.');
    return;
  }
  await ctx.reply(WELCOME);
  await askQuestion(ctx.reply, question);
};

/**
 * Non-command text. While onboarding is incomplete the message is the answer to the current question
 * — it never reaches the classifier (which must not see a bare "32" out of context). Otherwise it
 * falls through to FR-1 routing.
 */
export const handleText = async (ctx: TextContext, deps: BotDeps): Promise<void> => {
  const text = ctx.message.text;
  if (text.startsWith('/') || !ctx.chat) {
    return;
  }
  const chatId = BigInt(ctx.chat.id);

  if (await deps.onboarding.isOnboarding(chatId)) {
    await respondToAnswer(ctx.reply, await deps.onboarding.submitAnswer(chatId, text));
    return;
  }

  const routed = await classifyMessage(deps.anthropic, text, { userTz: deps.userTz });
  await ctx.reply(`intent: ${routed.intent} · date: ${routed.date}`);
};

/** Inline-keyboard tap during onboarding. Ignores foreign callback data. */
export const handleCallback = async (ctx: CallbackContext, deps: BotDeps): Promise<void> => {
  const data = ctx.callbackQuery?.data;
  if (!data?.startsWith(CALLBACK_PREFIX) || !ctx.chat) {
    return;
  }
  await ctx.answerCallbackQuery();
  // `onb:<field>:<value>` — the value (e.g. Europe/Kyiv) has no colon. A stale tap whose value
  // doesn't match the current question re-asks it (no double-advance).
  const value = data.slice(CALLBACK_PREFIX.length).split(':').slice(1).join(':');
  await respondToAnswer(ctx.reply, await deps.onboarding.submitAnswer(BigInt(ctx.chat.id), value));
};

/** Construct the grammY bot with handlers registered. Does not start polling — see index.ts. */
export const createBot = (token: string, deps: BotDeps): Bot => {
  const bot = new Bot(token);
  bot.command('start', (ctx) => handleStart(ctx, deps));
  bot.on('callback_query:data', (ctx) => handleCallback(ctx, deps));
  bot.on('message:text', (ctx) => handleText(ctx, deps));
  return bot;
};
