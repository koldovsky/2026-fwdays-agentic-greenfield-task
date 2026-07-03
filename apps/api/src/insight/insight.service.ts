import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  type DailyInsight,
  type TimeEntry,
  buildInsightInput,
  fallbackInsight,
  localDateKeyInTz,
  sanitizeInsight,
} from '@honeydo/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AnthropicService } from './anthropic.service';

const withTags = { tags: true } as const;
type EntryRow = Prisma.TimeEntryGetPayload<{ include: typeof withTags }>;

/** The subset of a `DailyInsight` row this service maps to the shared contract. */
interface InsightRow {
  text: string;
  source: string;
  localDate: string;
  createdAt: Date;
}

/** Validate an untrusted IANA zone; fall back to UTC when missing or unknown (design §1). */
function resolveTimeZone(tz?: string): string {
  if (!tz) return 'UTC';
  try {
    // Throws RangeError on an unknown zone.
    new Intl.DateTimeFormat('en-CA', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

/** Map a Prisma entry row (with tags) to the framework-free `@honeydo/shared` contract. */
function toEntry(row: EntryRow): TimeEntry {
  return {
    id: row.id,
    userId: row.userId,
    note: row.note,
    startedAt: row.startedAt.toISOString(),
    stoppedAt: row.stoppedAt ? row.stoppedAt.toISOString() : null,
    durationSec: row.durationSec,
    tags: row.tags.map((t) => ({
      id: t.id,
      userId: t.userId,
      name: t.name,
      color: t.color,
    })),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toContract(row: InsightRow): DailyInsight {
  return {
    text: row.text,
    source: row.source === 'llm' ? 'llm' : 'fallback',
    localDate: row.localDate,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Daily-insight service: shape the user's history into a numeric summary (in the user's time
 * zone), generate via the LLM when enabled, enforce guardrails, and cache one result per user
 * per local day — falling back deterministically on any failure (FR-INSIGHT-01→06, NFR-COST-01).
 */
@Injectable()
export class InsightService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly anthropic: AnthropicService,
  ) {}

  /** Today's insight — served from cache when present, otherwise generated and cached. */
  async getForToday(userId: string, tz?: string): Promise<DailyInsight> {
    const timeZone = resolveTimeZone(tz);
    const localDate = localDateKeyInTz(new Date(), timeZone);
    const cached = await this.prisma.dailyInsight.findUnique({
      where: { userId_localDate: { userId, localDate } },
    });
    if (cached) return toContract(cached);
    return this.generateAndCache(userId, timeZone, localDate);
  }

  /** Explicit refresh — regenerate today's insight and replace the cached value. */
  async refresh(userId: string, tz?: string): Promise<DailyInsight> {
    const timeZone = resolveTimeZone(tz);
    const localDate = localDateKeyInTz(new Date(), timeZone);
    return this.generateAndCache(userId, timeZone, localDate);
  }

  private async generateAndCache(
    userId: string,
    timeZone: string,
    localDate: string,
  ): Promise<DailyInsight> {
    const rows = await this.prisma.timeEntry.findMany({
      where: { userId },
      include: withTags,
    });
    const summary = buildInsightInput(rows.map(toEntry), new Date(), timeZone);

    let text: string | null = null;
    let source: 'llm' | 'fallback' = 'fallback';
    let model: string | null = null;

    if (this.anthropic.isEnabled()) {
      try {
        const clean = sanitizeInsight(
          await this.anthropic.generate(summary),
          summary,
        );
        if (clean) {
          text = clean;
          source = 'llm';
          model = this.anthropic.getModel();
        }
      } catch {
        // Timeout/error → deterministic fallback (FR-INSIGHT-06). Never surfaces to the client.
      }
    }
    if (!text) text = fallbackInsight(summary);

    const row = await this.prisma.dailyInsight.upsert({
      where: { userId_localDate: { userId, localDate } },
      create: { userId, localDate, text, source, model },
      update: { text, source, model },
    });
    return toContract(row);
  }
}
