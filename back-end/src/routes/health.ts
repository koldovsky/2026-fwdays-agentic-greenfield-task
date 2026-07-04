import type { FastifyInstance } from 'fastify';
import type { MdnsState } from '../mdns.js';

interface MdnsHealth {
  state: MdnsState;
  hostname?: string;
  address?: string;
  error?: string;
}

export async function registerHealthRoute(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    const handle = app.mdns?.handle;
    const mdns: MdnsHealth = handle
      ? {
          state: handle.state,
          hostname: handle.hostname,
          ...(handle.address !== undefined && { address: handle.address }),
          ...(handle.error !== undefined && { error: handle.error }),
        }
      : { state: 'stopped' };
    return { status: 'ok', mdns };
  });
}
