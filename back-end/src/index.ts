import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 80);
const host = process.env.HOST ?? '0.0.0.0';

const app = await createApp();

try {
  await app.listen({ port, host });
  app.log.info(`mytv back-end listening on http://${host}:${port}`);
} catch (error) {
  app.log.error({ err: error }, 'failed to start server');
  process.exit(1);
}

// Route signals into Fastify's shutdown flow so `onClose` hooks run —
// most importantly, mDNS gets a chance to broadcast its goodbye packet
// before the process exits. Without this, a Ctrl-C or `systemctl stop`
// leaves a stale `mytv.local` record cached on peer resolvers for the
// TTL window and the next startup collides with itself.
let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, 'received shutdown signal; closing server');
  try {
    await app.close();
    process.exit(0);
  } catch (error) {
    app.log.error({ err: error }, 'error during shutdown');
    process.exit(1);
  }
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
