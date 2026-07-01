import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type TimeEntry as TimeEntryRow } from '@prisma/client';
import type { TimeEntry } from '@honeydo/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import type { ManualTimeEntryDto } from './dto/manual-time-entry.dto';
import type { UpdateTimeEntryDto } from './dto/update-time-entry.dto';

/** Whole, non-negative seconds between two instants. */
function durationSeconds(start: Date, stop: Date): number {
  return Math.max(0, Math.floor((stop.getTime() - start.getTime()) / 1000));
}

/** Map a Prisma row to the framework-free `@honeydo/shared` contract. */
function toContract(row: TimeEntryRow): TimeEntry {
  return {
    id: row.id,
    userId: row.userId,
    note: row.note,
    startedAt: row.startedAt.toISOString(),
    stoppedAt: row.stoppedAt ? row.stoppedAt.toISOString() : null,
    durationSec: row.durationSec,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Time-entries service. Owns the **single-running-entry invariant** (FR-ENTRY-01/03/11):
 * start and continue stop any running entry inside one transaction before creating the
 * new one, so the app, widget, and Live Activity always observe one running entry.
 */
@Injectable()
export class TimeEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  /** All of the user's entries, newest start first (grouping happens client-side). */
  async list(userId: string): Promise<TimeEntry[]> {
    const rows = await this.prisma.timeEntry.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    });
    return rows.map(toContract);
  }

  /** The user's single running entry, or null. */
  async getRunning(userId: string): Promise<TimeEntry | null> {
    const row = await this.prisma.timeEntry.findFirst({
      where: { userId, stoppedAt: null },
    });
    return row ? toContract(row) : null;
  }

  /** Start a new running entry, stopping any currently-running one first. */
  async start(userId: string, dto: CreateTimeEntryDto): Promise<TimeEntry> {
    const startedAt = dto.startedAt ? new Date(dto.startedAt) : new Date();
    const row = await this.prisma.$transaction(async (tx) => {
      await this.stopRunning(tx, userId, startedAt);
      return tx.timeEntry.create({
        data: {
          userId,
          note: dto.note,
          startedAt,
          stoppedAt: null,
          durationSec: null,
        },
      });
    });
    return toContract(row);
  }

  /** Continue a past entry: start a fresh running entry copying its note (FR-ENTRY-08). */
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
        },
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
    const row = await this.prisma.timeEntry.create({
      data: {
        userId,
        note: dto.note,
        startedAt,
        stoppedAt,
        durationSec: durationSeconds(startedAt, stoppedAt),
      },
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

    const row = await this.prisma.timeEntry.update({
      where: { id },
      data: {
        note: dto.note ?? entry.note,
        startedAt,
        stoppedAt,
        durationSec: stoppedAt ? durationSeconds(startedAt, stoppedAt) : null,
      },
    });
    return toContract(row);
  }

  /** Delete one of the user's entries (FR-ENTRY-06). */
  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.prisma.timeEntry.delete({ where: { id } });
  }

  /** Fetch an entry that belongs to the user, or 404 (BC-SCOPE-01). */
  private async findOwned(userId: string, id: string): Promise<TimeEntryRow> {
    const entry = await this.prisma.timeEntry.findFirst({
      where: { id, userId },
    });
    if (!entry) {
      throw new NotFoundException('Time entry not found');
    }
    return entry;
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
