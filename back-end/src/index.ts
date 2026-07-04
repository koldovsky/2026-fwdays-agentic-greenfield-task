import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const app = await createApp();

try {
  await app.listen({ port, host });
  app.log.info(`mytv back-end listening on http://${host}:${port}`);
} catch (error) {
  app.log.error({ err: error }, 'failed to start server');
  process.exit(1);
}
