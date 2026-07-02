import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { TimeEntry } from '@honeydo/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import type { ManualTimeEntryDto } from './dto/manual-time-entry.dto';
import type { UpdateTimeEntryDto } from './dto/update-time-entry.dto';

/** Entries are always read/written with their tags attached (FR-TAG-02). */
const withTags = { tags: true } as const;
type EntryWithTags = Prisma.TimeEntryGetPayload<{ include: typeof withTags }>;

/** Whole, non-negative seconds between two instants. */
function durationSeconds(start: Date, stop: Date): number {
  return Math.max(0, Math.floor((stop.getTime() - start.getTime()) / 1000));
}

/** Map a Prisma row (with tags) to the framework-free `@honeydo/shared` contract. */
function toContract(row: EntryWithTags): TimeEntry {
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

/**
 * Time-entries service. Owns the **single-running-entry invariant** (FR-ENTRY-01/03/11):
 * start and continue stop any running entry inside one transaction before creating the
 * new one. Entries carry their tags; writes assign the user's own tags from `tagIds`.
 */
@Injectable()
export class TimeEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** All of the user's entries, newest start first (grouping happens client-side). */
  async list(userId: string): Promise<TimeEntry[]> {
    const rows = await this.prisma.timeEntry.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      include: withTags,
    });
    return rows.map(toContract);
  }

  /** The user's single running entry, or null. */
  async getRunning(userId: string): Promise<TimeEntry | null> {
    const row = await this.prisma.timeEntry.findFirst({
      where: { userId, stoppedAt: null },
      include: withTags,
    });
    return row ? toContract(row) : null;
  }

  /** Start a new running entry, stopping any currently-running one first. */
  async start(userId: string, dto: CreateTimeEntryDto): Promise<TimeEntry> {
    const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();
    const tagRefs = await this.ownedTagRefs(userId, dto.tagIds);
    const row = await this.prisma.$transaction(async (tx) => {
      await this.stopRunning(tx, userId, startedAt);
      return tx.timeEntry.create({
        data: {
          userId,
          note: dto.note,
          startedAt,
          stoppedAt: null,
          durationSec: null,
          tags: tagRefs ? { connect: tagRefs } : undefined,
        },
        include: withTags,
      });
    });
    return toContract(row);
  }

  /** Continue a past entry: start a fresh running entry copying its note + tags. */
  async continue(userId: string, id: string): Promise<TimeEntry> {
    const source = await this.findOwned(userId, id);
    const startedAt = new Date();
    const row = await this.prisma.$transaction(async (tx) => {
      await this.stopRunning(tx, userId, startedAt);
      return tx.timeEntry.create({
        data: {
          userId,
          note: source.note,
          startedAt,
          stoppedAt: null,
          durationSec: null,
          tags: { connect: source.tags.map((t) => ({ id: t.id })) },
        },
        include: withTags,
      });
    });
    return toContract(row);
  }

  /** Stop a specific running entry (FR-ENTRY-02). */
  async stop(userId: string, id: string): Promise<TimeEntry> {
    const entry = await this.findOwned(userId, id);
    if (entry.stoppedAt) {
      throw new BadRequestException('Entry is not running');
    }
    const stoppedAt = new Date();
    const row = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        stoppedAt,
        durationSec: durationSeconds(entry.startedAt, stoppedAt),
      },
      include: withTags,
    });
    return toContract(row);
  }

  /** Add a completed manual entry (FR-ENTRY-04); never becomes the running entry. */
  async createManual(
    userId: string,
    dto: ManualTimeEntryDto,
  ): Promise<TimeEntry> {
    const startedAt = new Date(dto.startedAt);
    const stoppedAt = new Date(dto.stoppedAt);
    if (stoppedAt.getTime() <= startedAt.getTime()) {
      throw new BadRequestException('End time must be after start time');
    }
    const tagRefs = await this.ownedTagRefs(userId, dto.tagIds);
    const row = await this.prisma.timeEntry.create({
      data: {
        userId,
        note: dto.note,
        startedAt,
        stoppedAt,
        durationSec: durationSeconds(startedAt, stoppedAt),
        tags: tagRefs ? { connect: tagRefs } : undefined,
      },
      include: withTags,
    });
    return toContract(row);
  }

  /** Edit an entry (FR-ENTRY-05); recompute duration and never leave two running. */
  async update(
    userId: string,
    id: string,
    dto: UpdateTimeEntryDto,
  ): Promise<TimeEntry> {
    const entry = await this.findOwned(userId, id);
    const startedAt = dto.startedAt ? new Date(dto.startedAt) : entry.startedAt;
    const stoppedAt =
      dto.stoppedAt !== undefined ? new Date(dto.stoppedAt) : entry.stoppedAt;

    if (stoppedAt) {
      if (stoppedAt.getTime() <= startedAt.getTime()) {
        throw new BadRequestException('End time must be after start time');
      }
    } else {
      // Editing keeps this entry running — reject if another entry is already running.
      const otherRunning = await this.prisma.timeEntry.findFirst({
        where: { userId, stoppedAt: null, id: { not: id } },
      });
      if (otherRunning) {
        throw new BadRequestException('Another entry is already running');
      }
    }

    // `tagIds` omitted → leave tags unchanged; provided (incl. []) → set exactly those.
    const tagRefs = await this.ownedTagRefs(userId, dto.tagIds);
    const row = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        note: dto.note ?? entry.note,
        startedAt,
        stoppedAt,
        durationSec: stoppedAt ? durationSeconds(startedAt, stoppedAt) : null,
        tags: tagRefs ? { set: tagRefs } : undefined,
      },
      include: withTags,
    });
    return toContract(row);
  }

  /** Delete one of the user's entries (FR-ENTRY-06). */
  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.prisma.timeEntry.delete({ where: { id } });
  }

  /** Fetch an entry (with tags) that belongs to the user, or 404 (BC-SCOPE-01). */
  private async findOwned(userId: string, id: string): Promise<EntryWithTags> {
    const entry = await this.prisma.timeEntry.findFirst({
      where: { id, userId },
      include: withTags,
    });
    if (!entry) {
      throw new NotFoundException('Time entry not found');
    }
    return entry;
  }

  /**
   * Resolve `tagIds` to `{ id }` refs for the user's OWN tags only (foreign ids are
   * dropped). Returns `undefined` when `tagIds` is omitted (caller leaves tags
   * unchanged), or `[]` when the list is empty/all-foreign (caller clears them).
   */
  private async ownedTagRefs(
    userId: string,
    tagIds?: string[],
  ): Promise<{ id: string }[] | undefined> {
    if (tagIds === undefined) return undefined;
    if (tagIds.length === 0) return [];
    const owned = await this.prisma.tag.findMany({
      where: { userId, id: { in: tagIds } },
      select: { id: true },
    });
    return owned.map((t) => ({ id: t.id }));
  }

  /** Stop the user's running entry (if any) as of `at`, within a transaction. */
  private async stopRunning(
    tx: Prisma.TransactionClient,
    userId: string,
    at: Date,
  ): Promise<void> {
    const running = await tx.timeEntry.findFirst({
      where: { userId, stoppedAt: null },
    });
    if (!running) return;
    await tx.timeEntry.update({
      where: { id: running.id },
      data: {
        stoppedAt: at,
        durationSec: durationSeconds(running.startedAt, at),
      },
    });
  }
}
