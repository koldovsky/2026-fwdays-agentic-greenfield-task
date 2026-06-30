import type { Server } from 'node:http';
import type { Bot } from 'grammy';
import { type Env, EnvValidationError, loadEnv } from './config/env.js';
import { createBot } from './bot/bot.js';
import { createHealthServer } from './bot/health.js';

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
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
};

const main = async (): Promise<void> => {
  const env = loadEnvOrExit();

  const health = createHealthServer();
  health.listen(env.PORT, () => console.log(`Health server listening on :${env.PORT}`));

  const bot = createBot(env.TELEGRAM_BOT_TOKEN);
  registerShutdown(bot, health);

  // Long-poll (getUpdates) — no webhook, no public ingress, no TLS (ADR-0014).
  console.log('Starting bot (long-poll)...');
  await bot.start();
};

void main();
