import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { IncomingMessage } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { createHttpsTransport } from './jsonrpc.js';
import type { TvError } from './errors.js';

const silentLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

function startServer(
  onConnection: (ws: WebSocket, req: IncomingMessage) => void,
): Promise<{ server: WebSocketServer; port: number }> {
  return new Promise((resolve) => {
    const server = new WebSocketServer({ host: '127.0.0.1', port: 0 }, () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        throw new Error('test server did not bind a TCP port');
      }
      resolve({ server, port: address.port });
    });
    server.on('connection', onConnection);
  });
}

test('connectHandshake resolves with a token on ms.channel.connect', async () => {
  const { server, port } = await startServer((ws) => {
    ws.send(JSON.stringify({ event: 'ms.channel.connect', data: { token: 'NEW-TOKEN' } }));
  });
  try {
    const transport = createHttpsTransport({ ip: '127.0.0.1', port, logger: silentLogger });
    const result = await transport.connectHandshake();
    assert.equal(result.token, 'NEW-TOKEN');
    await transport.close();
  } finally {
    server.close();
  }
});

test('connectHandshake resolves with no token when the TV just re-confirms trust', async () => {
  const { server, port } = await startServer((ws) => {
    ws.send(JSON.stringify({ event: 'ms.channel.connect', data: {} }));
  });
  try {
    const transport = createHttpsTransport({
      ip: '127.0.0.1',
      port,
      logger: silentLogger,
      token: 'already-trusted',
    });
    const result = await transport.connectHandshake();
    assert.equal(result.token, undefined);
    await transport.close();
  } finally {
    server.close();
  }
});

test('connectHandshake rejects with TvNotSupported on ms.channel.unauthorized', async () => {
  const { server, port } = await startServer((ws) => {
    ws.send(JSON.stringify({ event: 'ms.channel.unauthorized' }));
  });
  try {
    const transport = createHttpsTransport({ ip: '127.0.0.1', port, logger: silentLogger });
    await assert.rejects(transport.connectHandshake(), (err: unknown) => {
      assert.equal((err as TvError).code, 'TvNotSupported');
      return true;
    });
    await transport.close();
  } finally {
    server.close();
  }
});

test('connectHandshake rejects with TvNotReachable when the server closes before an ack', async () => {
  const { server, port } = await startServer((ws) => {
    ws.close();
  });
  try {
    const transport = createHttpsTransport({ ip: '127.0.0.1', port, logger: silentLogger });
    await assert.rejects(transport.connectHandshake(), (err: unknown) => {
      assert.equal((err as TvError).code, 'TvNotReachable');
      return true;
    });
  } finally {
    server.close();
  }
});

test('call() sends a text frame the server receives with the method/params shape', async () => {
  const received: string[] = [];
  const { server, port } = await startServer((ws) => {
    ws.send(JSON.stringify({ event: 'ms.channel.connect', data: {} }));
    ws.on('message', (raw) => received.push(raw.toString()));
  });
  try {
    const transport = createHttpsTransport({ ip: '127.0.0.1', port, logger: silentLogger });
    await transport.connectHandshake();
    await transport.call('ms.remote.control', { Cmd: 'Click', DataOfCmd: 'KEY_VOLUP' });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(received.length, 1);
    const parsed = JSON.parse(received[0]!) as Record<string, unknown>;
    assert.equal(parsed.method, 'ms.remote.control');
    assert.deepEqual(parsed.params, { Cmd: 'Click', DataOfCmd: 'KEY_VOLUP' });
    await transport.close();
  } finally {
    server.close();
  }
});

test('ping() resolves once the server pongs back', async () => {
  const { server, port } = await startServer((ws) => {
    ws.send(JSON.stringify({ event: 'ms.channel.connect', data: {} }));
  });
  try {
    const transport = createHttpsTransport({ ip: '127.0.0.1', port, logger: silentLogger });
    await transport.connectHandshake();
    await transport.ping();
    await transport.close();
  } finally {
    server.close();
  }
});

test('ping() rejects immediately (no dangling listener/timer) once the socket is closed', async () => {
  const { server, port } = await startServer((ws) => {
    ws.send(JSON.stringify({ event: 'ms.channel.connect', data: {} }));
  });
  try {
    const transport = createHttpsTransport({ ip: '127.0.0.1', port, logger: silentLogger });
    await transport.connectHandshake();
    await transport.close();
    await assert.rejects(transport.ping(), (err: unknown) => {
      assert.equal((err as TvError).code, 'TvNotReachable');
      return true;
    });
  } finally {
    server.close();
  }
});

test('close() closes the socket with code 1000', async () => {
  const closeCodes: number[] = [];
  const { server, port } = await startServer((ws) => {
    ws.send(JSON.stringify({ event: 'ms.channel.connect', data: {} }));
    ws.on('close', (code) => closeCodes.push(code));
  });
  try {
    const transport = createHttpsTransport({ ip: '127.0.0.1', port, logger: silentLogger });
    await transport.connectHandshake();
    await transport.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(closeCodes, [1000]);
  } finally {
    server.close();
  }
});
