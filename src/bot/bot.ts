import { Bot, InlineKeyboard } from 'grammy';
import { isExpired } from '../clarify/store.js';
import type { OpenQuestion, OutboundQuestion } from '../clarify/types.js';
import { classifyMessage } from '../router/router.js';
import {
  AnswerStatus,
  QuestionKind,
  type AnswerResult,
  type Question,
  type Targets,
} from '../onboarding/types.js';
import { catalogReply } from '../food/confirm.js';
import type { Confirmation } from '../food/types.js';
import type {
  BotDeps,
  CallbackContext,
  PhotoContext,
  ReplyFn,
  StartContext,
  TextContext,
} from './types.js';

// Callback data is namespaced so each handler tells its own buttons apart: `onb:<field>:<value>` for
// onboarding, `food:addfdb:<foodLogId>` for the add-to-Food-DB offer, `q:<value>` for an Open
// Question fixed choice (the chosen English option value carried verbatim — invariant #6).
const CALLBACK_PREFIX = 'onb:';
const FOOD_ADD_PREFIX = 'food:addfdb:';
const CLARIFY_PREFIX = 'q:';
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

/** Reply with a food confirmation, attaching the add-to-Food-DB button on the estimate path. */
const replyConfirmation = async (reply: ReplyFn, confirmation: Confirmation): Promise<void> => {
  if (!confirmation.addToCatalog) {
    await reply(confirmation.text);
    return;
  }
  const kb = new InlineKeyboard().text(
    confirmation.addToCatalog.label,
    `${FOOD_ADD_PREFIX}${confirmation.addToCatalog.id}`,
  );
  await reply(confirmation.text, { reply_markup: kb });
};

/**
 * Ask an Open Question. Fixed-choice options become inline buttons showing the option `label`; the
 * callback carries `q:<index>` (the option's position), NOT its value — so a Cyrillic choice can never
 * overflow Telegram's 64-byte callback_data limit. The tap is mapped back to the option value on
 * resolution. Open-ended unknowns (portion, free description) take free text — no keyboard.
 */
const askClarify = async (reply: ReplyFn, question: OutboundQuestion): Promise<void> => {
  if (!question.options || question.options.length === 0) {
    await reply(question.text);
    return;
  }
  const kb = new InlineKeyboard();
  question.options.forEach((option, index) => {
    kb.text(option.label, `${CLARIFY_PREFIX}${index}`).row();
  });
  await reply(question.text, { reply_markup: kb });
};

/** Map a `q:<index>` tap back to the pending question's stored option value (null if out of range). */
const optionValueAt = (pending: OpenQuestion, token: string): string | null => {
  const index = Number(token);
  const option = pending.clarification.options?.[index];
  return Number.isInteger(index) && option ? option.value : null;
};

/** Reply with a resolved-answer confirmation when the food service produced one (else stay silent). */
const replyIfConfirmed = async (
  reply: ReplyFn,
  confirmation: Confirmation | null,
): Promise<void> => {
  if (!confirmation) {
    return;
  }
  await replyConfirmation(reply, confirmation);
};

/**
 * Dispatch an already-classified message to the owning service. A `log` intent goes through
 * `logFood`, which may return an `ask` outcome — store the Open Question and pose it instead of
 * writing. Split from classification so a caller that already classified (the non-answer fallback)
 * can reuse its result instead of paying a second classifier call.
 */
const dispatch = async (
  ctx: TextContext,
  deps: BotDeps,
  chatId: bigint,
  routed: Awaited<ReturnType<typeof classifyMessage>>,
): Promise<void> => {
  const text = ctx.message.text;
  if (routed.intent === 'metric') {
    const confirmation = await deps.metrics.logMetric(chatId, text, routed);
    if (confirmation) {
      await ctx.reply(confirmation.text);
    }
    return;
  }
  if (routed.intent === 'query') {
    const answer = await deps.query.answerQuery(chatId, text, routed);
    if (answer) {
      await ctx.reply(answer.text);
    }
    return;
  }
  if (routed.intent === 'correction') {
    await replyIfConfirmed(ctx.reply, await deps.food.correctLast(chatId, text, routed));
    return;
  }
  if (routed.intent !== 'log') {
    await ctx.reply(`intent: ${routed.intent} · date: ${routed.date}`);
    return;
  }

  const outcome = await deps.food.logFood(chatId, text, routed);
  if (!outcome) {
    return;
  }
  if (outcome.kind === 'ask') {
    deps.clarify.set(chatId, outcome.pending);
    await askClarify(ctx.reply, outcome.question);
    return;
  }
  await replyConfirmation(ctx.reply, outcome.confirmation);
};

/** Classify a fresh message (no pending Open Question) and dispatch it. `answer` is not selectable. */
const routeFresh = async (ctx: TextContext, deps: BotDeps, chatId: bigint): Promise<void> => {
  const routed = await classifyMessage(deps.anthropic, ctx.message.text, { userTz: deps.userTz });
  await dispatch(ctx, deps, chatId, routed);
};

/**
 * Resolve a pending Open Question from the next message (design D4). The pending question was already
 * `take`-n from the store by the caller (so the store can't be double-read). The router is called
 * with `hasPendingQuestion=true` so `answer` is selectable. An `answer` refines-and-logs; any other
 * intent means the user moved on — fall back to the estimate (never drop the entry) then dispatch the
 * SAME classification (no second classifier call).
 */
const resolvePending = async (
  ctx: TextContext,
  deps: BotDeps,
  chatId: bigint,
  pending: OpenQuestion,
): Promise<void> => {
  const text = ctx.message.text;
  const routed = await classifyMessage(deps.anthropic, text, {
    userTz: deps.userTz,
    hasPendingQuestion: true,
  });
  if (routed.intent === 'answer') {
    await replyIfConfirmed(ctx.reply, await deps.food.resolveAnswer(chatId, pending, text));
    return;
  }

  await deps.food.logExpiredEstimate(chatId, pending);
  await dispatch(ctx, deps, chatId, routed);
};

/**
 * Non-command text. While onboarding is incomplete the message is the answer to the current question
 * — it never reaches the classifier (which must not see a bare "32" out of context). Otherwise: if an
 * Open Question is pending it either resolves (fresh) or falls back to its estimate (expired) before
 * routing; with none pending the message routes fresh (design D4).
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

  // Take the pending question (read-and-remove) and act on THAT value, so the one-pending-per-chat
  // guard can't be defeated by resolving a reference the store still holds. `take` returns null when
  // nothing is pending — no separate `peek` needed.
  const pending = deps.clarify.take(chatId);
  if (pending === null) {
    await routeFresh(ctx, deps, chatId);
    return;
  }
  if (isExpired(pending.askedAt, new Date())) {
    await deps.food.logExpiredEstimate(chatId, pending);
    await routeFresh(ctx, deps, chatId);
    return;
  }

  await resolvePending(ctx, deps, chatId, pending);
};

/**
 * Download a Telegram photo to base64 IN MEMORY (invariant #4): pick the LARGEST size (last element),
 * resolve its file path via grammY `getFile`, fetch the bytes from the Telegram file endpoint, and
 * return a base64 string. It receives no path and writes nothing to disk — the CRITICAL fs-spy test
 * asserts zero writes across a full run. `null` when the file path is missing (nothing to download)
 * or the Telegram file endpoint returns non-2xx (expired/invalid link — never base64 an error body
 * into the vision call).
 */
const downloadPhotoBase64 = async (ctx: PhotoContext): Promise<string | null> => {
  const largest = ctx.message.photo.at(-1);
  if (!largest) {
    return null;
  }
  const file = await ctx.getFile();
  if (!file.file_path) {
    return null;
  }

  const url = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;
  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }
  const bytes = await response.arrayBuffer();

  return Buffer.from(bytes).toString('base64');
};

/**
 * A plate photo. Onboarding-gated exactly like `handleText` (a photo mid-onboarding is not a food
 * log). Otherwise: download the bytes to base64 in memory, run the single vision call via `logPhoto`,
 * and either reply with the multi-item confirmation or — on an `ask` outcome (a hidden high-leverage
 * mover) — store the photo Open Question and pose it (mirrors `dispatch`). The image lives only in the
 * base64 string and is never persisted (invariant #4).
 */
export const handlePhoto = async (ctx: PhotoContext, deps: BotDeps): Promise<void> => {
  if (!ctx.chat) {
    return;
  }
  const chatId = BigInt(ctx.chat.id);

  if (await deps.onboarding.isOnboarding(chatId)) {
    return;
  }

  const imageBase64 = await downloadPhotoBase64(ctx);
  if (imageBase64 === null) {
    return;
  }

  const outcome = await deps.food.logPhoto(chatId, ctx.message.caption ?? '', imageBase64);
  if (!outcome) {
    return;
  }
  if (outcome.kind === 'ask') {
    deps.clarify.set(chatId, outcome.pending);
    await askClarify(ctx.reply, outcome.question);
    return;
  }
  await replyConfirmation(ctx.reply, outcome.confirmation);
};

/** `food:addfdb:<id>` tap — persist the logged estimate to the user's Food DB. */
const handleFoodCallback = async (
  ctx: CallbackContext,
  deps: BotDeps,
  data: string,
): Promise<void> => {
  await ctx.answerCallbackQuery();
  const foodLogId = Number(data.slice(FOOD_ADD_PREFIX.length));
  if (!Number.isInteger(foodLogId) || !ctx.chat) {
    return;
  }
  const result = await deps.food.saveToCatalog(BigInt(ctx.chat.id), foodLogId);
  await ctx.reply(catalogReply(result));
};

/**
 * `q:<index>` tap — the chosen fixed answer to a pending Open Question. Maps the index back to the
 * stored option value, refines-and-logs via the food service, then clears the pending question. A tap
 * with no pending question (stale after a restart) is acknowledged and ignored; a tap after the TTL
 * falls back to the estimate (mirrors the text path — a late tap never resolves an expired question).
 */
const handleClarifyCallback = async (
  ctx: CallbackContext,
  deps: BotDeps,
  data: string,
): Promise<void> => {
  await ctx.answerCallbackQuery();
  if (!ctx.chat) {
    return;
  }
  const chatId = BigInt(ctx.chat.id);
  const pending = deps.clarify.take(chatId);
  if (!pending) {
    return;
  }
  if (isExpired(pending.askedAt, new Date())) {
    await replyIfConfirmed(ctx.reply, await deps.food.logExpiredEstimate(chatId, pending));
    return;
  }
  const value = optionValueAt(pending, data.slice(CLARIFY_PREFIX.length));
  if (value === null) {
    return;
  }
  await replyIfConfirmed(ctx.reply, await deps.food.resolveAnswer(chatId, pending, value));
};

/** Inline-keyboard tap. Dispatches by namespace; ignores foreign callback data. */
export const handleCallback = async (ctx: CallbackContext, deps: BotDeps): Promise<void> => {
  const data = ctx.callbackQuery?.data;
  if (!data || !ctx.chat) {
    return;
  }
  if (data.startsWith(FOOD_ADD_PREFIX)) {
    await handleFoodCallback(ctx, deps, data);
    return;
  }
  if (data.startsWith(CLARIFY_PREFIX)) {
    await handleClarifyCallback(ctx, deps, data);
    return;
  }
  if (!data.startsWith(CALLBACK_PREFIX)) {
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
  bot.on('message:photo', (ctx) => handlePhoto(ctx, deps));
  return bot;
};
