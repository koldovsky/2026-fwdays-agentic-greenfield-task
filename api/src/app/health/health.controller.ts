import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

// Fail fast: the pool's own timeouts add up to ~10s when MySQL is down
// (S-01 review finding); a health probe must answer well before that.
export const HEALTH_DB_TIMEOUT_MS = 2_000;

// GET /api/health (NFR-OBS-01): Railway healthcheck target. An app that
// cannot reach MySQL is not serving the product, hence 503 (design D3).
// Public: the healthcheck must work without a session (S-02 D5 allowlist).
@Public()
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{ status: string; db: string }> {
    try {
      await withTimeout(this.prisma.$queryRaw`SELECT 1`, HEALTH_DB_TIMEOUT_MS);
      return { status: 'ok', db: 'up' };
    } catch (err) {
      this.logger.warn(`DB healthcheck failed: ${String(err)}`);
      throw new HttpException(
        { status: 'error', db: 'down' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`health DB probe timed out after ${ms}ms`)),
      ms,
    );
    timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
