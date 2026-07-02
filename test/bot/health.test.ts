import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { createHealthServer } from '../../src/bot/health.js';

describe('health server', () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    server = createHealthServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve())),
    );
  });

  it('returns 200 with JSON liveness on GET /health', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/json');
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('ok');
  });

  it('carries numeric RSS/heap/uptime memory evidence (PRD §4 M6)', async () => {
    const res = await fetch(`${baseUrl}/health`);
    const body = (await res.json()) as {
      rssMb: unknown;
      heapUsedMb: unknown;
      uptimeSec: unknown;
    };
    expect(typeof body.rssMb).toBe('number');
    expect(typeof body.heapUsedMb).toBe('number');
    expect(typeof body.uptimeSec).toBe('number');
    expect(body.rssMb).toBeGreaterThan(0);
  });

  it('returns 404 on any other path', async () => {
    const res = await fetch(`${baseUrl}/nope`);
    expect(res.status).toBe(404);
  });
});
