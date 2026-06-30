import { Bot, type Context } from 'grammy';

// The tracer-bullet greeting. grammY's ctx.reply targets the same chat the update came from, so
// this proves the full round-trip (Telegram -> bot -> Telegram) without any chat-history state.
const START_MESSAGE = 'Привет! Я на связи. / Bot is live. Send /start to check the round-trip.';

/**
 * Handle `/start` by replying into the same chat. Typed on the minimal `reply` surface so it can
 * be unit-tested with a stub context instead of a live grammY runtime.
 */
export const handleStart = async (ctx: Pick<Context, 'reply'>): Promise<void> => {
  await ctx.reply(START_MESSAGE);
};

/** Construct the grammY bot with handlers registered. Does not start polling — see index.ts. */
export const createBot = (token: string): Bot => {
  const bot = new Bot(token);
  bot.command('start', handleStart);
  return bot;
};
