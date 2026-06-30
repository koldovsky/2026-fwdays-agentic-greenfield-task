import { Bot, type Context } from 'grammy';
import type Anthropic from '@anthropic-ai/sdk';
import { classifyMessage } from '../router/router.js';

// The tracer-bullet greeting. grammY's ctx.reply targets the same chat the update came from, so
// this proves the full round-trip (Telegram -> bot -> Telegram) without any chat-history state.
// Prose is Ukrainian (the bot mirrors the user's language in prose; structural fields stay English).
const START_MESSAGE =
  "Привіт! Я твій тренер з харчування — і я на зв'язку. Напиши /start, щоб перевірити з'єднання.";

/** Dependencies the message handlers need (the LLM client + the user's timezone). */
export interface BotDeps {
  anthropic: Anthropic;
  userTz: string;
}

/** Minimal text-message context surface, so the handler is unit-testable without a live runtime. */
export interface TextContext {
  message: { text: string };
  reply: (text: string) => Promise<unknown>;
}

/**
 * Handle `/start` by replying into the same chat. Typed on the minimal `reply` surface so it can
 * be unit-tested with a stub context instead of a live grammY runtime.
 */
export const handleStart = async (ctx: Pick<Context, 'reply'>): Promise<void> => {
  await ctx.reply(START_MESSAGE);
};

/**
 * Route a non-command text message through the FR-1 classifier and dispatch on the intent. The
 * first wired path reflects the classified intent + resolved date (the per-intent handlers land in
 * their own changes). Commands (leading `/`) are handled elsewhere and skipped here.
 */
export const handleText = async (ctx: TextContext, deps: BotDeps): Promise<void> => {
  const text = ctx.message.text;
  if (text.startsWith('/')) {
    return;
  }

  const routed = await classifyMessage(deps.anthropic, text, { userTz: deps.userTz });

  await ctx.reply(`intent: ${routed.intent} · date: ${routed.date}`);
};

/** Construct the grammY bot with handlers registered. Does not start polling — see index.ts. */
export const createBot = (token: string, deps: BotDeps): Bot => {
  const bot = new Bot(token);
  bot.command('start', handleStart);
  bot.on('message:text', (ctx) => handleText(ctx, deps));
  return bot;
};
