import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

// Minimal internal liveness probe for Coolify's healthcheck (ADR-0014). This port is NOT publicly
// routed and carries no Telegram traffic — updates arrive over the outbound long-poll. A bare
// node:http server keeps the runtime dependency-free and the RSS footprint minimal (invariant #7).

const MB = 1024 * 1024;
const roundMb = (bytes: number): number => Math.round(bytes / MB);

/** Liveness + memory snapshot: the on-box evidence for the 512 MB RSS cap (PRD §4 M6, design D7). */
interface HealthBody {
  status: 'ok';
  rssMb: number;
  heapUsedMb: number;
  uptimeSec: number;
}

const healthBody = (): HealthBody => {
  const memory = process.memoryUsage();

  return {
    status: 'ok',
    rssMb: roundMb(memory.rss),
    heapUsedMb: roundMb(memory.heapUsed),
    uptimeSec: Math.round(process.uptime()),
  };
};

/** Request handler for the health server. Exported for unit testing without a live socket. */
export const handleHealthRequest = (req: IncomingMessage, res: ServerResponse): void => {
  if (req.method === 'GET' && req.url === '/health') {
    // Any 200 keeps Coolify's status-code probe green; the JSON body adds RSS/heap/uptime evidence.
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(healthBody()));
    return;
  }
  res.writeHead(404);
  res.end();
};

/** Build (but do not start) the health HTTP server. Call `.listen(port)` to bind. */
export const createHealthServer = (): Server => createServer(handleHealthRequest);
