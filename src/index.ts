import type { Server } from 'node:http';
import type { Bot } from 'grammy';
import { type Env, EnvValidationError, loadEnv } from './config/env.js';
import { createBot } from './bot/bot.js';
import { createHealthServer } from './bot/health.js';
import { prisma } from './db/client.js';
import { createFoodService } from './food/service.js';
import { createAnthropicClient } from './llm/client.js';
import { createMetricsService } from './metrics/service.js';
import { createOnboardingService } from './onboarding/flow.js';
import { createQueryService } from './query/service.js';

/** Confirm the DB is reachable (migrations are applied by `migrate deploy` before this). */
const connectDbOrExit = async (): Promise<void> => {
  try {
    await prisma.$connect();
  } catch (error) {
    console.error('Database connection failed:', error instanceof Error ? error.message : error);
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

const registerShutdown = (bot: Bot, health: Server): void => {
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`Received ${signal}, shutting down...`);
    await bot.stop();
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
  const onboarding = createOnboardingService(prisma);
  const food = createFoodService(prisma, anthropic, env.TZ);
  const metrics = createMetricsService(prisma);
  const query = createQueryService(prisma);
  const bot = createBot(env.TELEGRAM_BOT_TOKEN, {
    anthropic,
    userTz: env.TZ,
    onboarding,
    food,
    metrics,
    query,
  });
  registerShutdown(bot, health);

  // Long-poll (getUpdates) — no webhook, no public ingress, no TLS (ADR-0014).
  console.log('Starting bot (long-poll)...');
  await bot.start();
};

void main();
