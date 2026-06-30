import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

// Minimal internal liveness probe for Coolify's healthcheck (ADR-0014). This port is NOT publicly
// routed and carries no Telegram traffic — updates arrive over the outbound long-poll. A bare
// node:http server keeps the runtime dependency-free and the RSS footprint minimal (invariant #7).

/** Request handler for the health server. Exported for unit testing without a live socket. */
export const handleHealthRequest = (req: IncomingMessage, res: ServerResponse): void => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }
  res.writeHead(404);
  res.end();
};

/** Build (but do not start) the health HTTP server. Call `.listen(port)` to bind. */
export const createHealthServer = (): Server => createServer(handleHealthRequest);
