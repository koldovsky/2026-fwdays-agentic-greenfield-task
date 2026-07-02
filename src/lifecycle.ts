import { errorMessage } from './util/error.js';

// Process lifecycle: the graceful-shutdown routine and the last-resort fatal-error posture
// (design D2/D6, ADR-0023). Extracted from index.ts so both are unit-testable with injected targets
// — no live bot/DB/box and no global process side effects in the pure builders.

/** The teardown-ordered targets the shutdown routine drains. */
export interface ShutdownTargets {
  bot: { stop: () => Promise<void> };
  health: { close: () => void };
  worker: { stop: () => Promise<void> } | null;
  reviewTask: { stop: () => void };
  disconnect: () => Promise<void>;
}

/**
 * Build the graceful-shutdown routine (design D6). The review cron is stopped FIRST so no new sweep
 * starts mid-shutdown, then polling drains and the in-flight mirror row finishes before the DB is
 * dropped (invariant #7).
 */
export const buildShutdown =
  (targets: ShutdownTargets) =>
  async (signal: string): Promise<void> => {
    console.log(`Received ${signal}, shutting down...`);
    targets.reviewTask.stop();
    await targets.bot.stop();
    await targets.worker?.stop();
    targets.health.close();
    await targets.disconnect();
  };

/** Register the shutdown routine on SIGINT/SIGTERM. */
export const registerShutdown = (targets: ShutdownTargets): void => {
  const shutdown = buildShutdown(targets);
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
};

/**
 * Build a fatal-error handler (design D2): an escaped rejection or uncaught exception leaves the
 * process in undefined state on a data-authoritative bot — log the reason MESSAGE ONLY (invariant #9)
 * and exit non-zero. The supervisor restarts the container; long-poll redelivers unacked updates, so
 * no logged entry is lost (Postgres writes are already committed or absent).
 */
export const buildFatalHandler =
  (kind: string) =>
  (reason: unknown): never => {
    console.error(`Fatal: ${kind}: ${errorMessage(reason)}`);
    process.exit(1);
  };

/** Install the `unhandledRejection`/`uncaughtException` handlers. */
export const registerFatalHandlers = (): void => {
  process.on('unhandledRejection', buildFatalHandler('unhandled rejection'));
  process.on('uncaughtException', buildFatalHandler('uncaught exception'));
};
