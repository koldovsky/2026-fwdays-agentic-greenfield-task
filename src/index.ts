import type { Server } from 'node:http';
import type { Bot } from 'grammy';
import { type Env, EnvValidationError, loadEnv } from './config/env.js';
import { createBot } from './bot/bot.js';
import { clarifyStore } from './clarify/store.js';
import { createHealthServer } from './bot/health.js';
import { prisma } from './db/client.js';
import { createFoodService } from './food/service.js';
import { createAnthropicClient } from './llm/client.js';
import { createMetricsService } from './metrics/service.js';
import { createNotionOutbox, noopOutbox, warnIfIncompleteNotionConfig } from './notion/outbox.js';
import { startNotionWorker, type NotionWorker } from './notion/worker.js';
import type { NotionOutbox } from './notion/types.js';
import { createOnboardingService } from './onboarding/flow.js';
import { createProgressService } from './progress/service.js';
import { progressStore } from './progress/store.js';
import { createQueryService } from './query/service.js';
import { createReviewsService } from './reviews/service.js';
import { startReviewScheduler, type SendFn } from './reviews/scheduler.js';
import { systemNow } from './util/date.js';
import { errorMessage } from './util/error.js';

/** Confirm the DB is reachable (migrations are applied by `migrate deploy` before this). */
const connectDbOrExit = async (): Promise<void> => {
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('Database connection failed:', errorMessage(error));
    process.exit(1);
  }
};

/** Validate the environment; on failure, print the offending keys and exit non-zero (no boot). */
const loadEnvOrExit = (): Env => {
  try {
    return loadEnv();
  } catch (error) {
    const message = error instanceof EnvValidationError ? error.message : String(error);
    console.error(message);
    process.exit(1);
  }
};

const registerShutdown = (bot: Bot, health: Server, worker: NotionWorker | null): void => {
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`Received ${signal}, shutting down...`);
    await bot.stop();
    // Stop polling and let the in-flight mirror row finish before we drop the DB (invariant #7).
    await worker?.stop();
    health.close();
    await prisma.$disconnect();
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
};

const main = async (): Promise<void> => {
  const env = loadEnvOrExit();

  // DB must be reachable before we serve traffic — the DB is the memory (invariant #1).
  await connectDbOrExit();

  const health = createHealthServer();
  health.listen(env.PORT, () => console.log(`Health server listening on :${env.PORT}`));

  const anthropic = createAnthropicClient(env.ANTHROPIC_API_KEY);
  // Best-effort Notion mirror (US-10, M7): a real outbox only when a token is configured, else a
  // no-op so the bot boots and behaves identically with no NOTION_* set. Warn once if the token is
  // set but the DB ids are incomplete (rows would silently skip forever).
  warnIfIncompleteNotionConfig(env);
  const outbox: NotionOutbox = env.NOTION_TOKEN ? createNotionOutbox(prisma, env) : noopOutbox;
  const onboarding = createOnboardingService(prisma);
  const food = createFoodService(prisma, anthropic, env.TZ, systemNow, outbox);
  const metrics = createMetricsService(prisma, outbox);
  const query = createQueryService(prisma);
  const progress = createProgressService(prisma, anthropic, env.TZ);
  const reviews = createReviewsService(prisma, { anthropic, outbox });
  const bot = createBot(env.TELEGRAM_BOT_TOKEN, {
    anthropic,
    userTz: env.TZ,
    onboarding,
    food,
    metrics,
    query,
    reviews,
    clarify: clarifyStore,
    progress,
    progressArm: progressStore,
  });
  // In-process Notion mirror worker (US-10; invariant #7 — no second process). Started only when a
  // token is set; its stop() is awaited in shutdown so an in-flight row finishes cleanly.
  const worker = env.NOTION_TOKEN ? startNotionWorker(prisma, env) : null;
  registerShutdown(bot, health, worker);

  // Midnight review fallback (ADR-0020): one hourly node-cron sweep pushes each user's finished-day
  // review at their local midnight. Started before `bot.start()` (which blocks until shutdown).
  const send: SendFn = (chatId, text) => bot.api.sendMessage(chatId.toString(), text);
  startReviewScheduler(reviews, prisma, send);

  // Long-poll (getUpdates) — no webhook, no public ingress, no TLS (ADR-0014).
  console.log('Starting bot (long-poll)...');
  await bot.start();
};

void main();
