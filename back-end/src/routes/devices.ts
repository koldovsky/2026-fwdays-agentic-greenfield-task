import type { FastifyInstance } from 'fastify';

export async function registerDevicesRoute(app: FastifyInstance): Promise<void> {
  app.get('/devices', async () => {
    const registry = app.discovery?.registry;
    return registry ? registry.snapshot() : [];
  });
}
