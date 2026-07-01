import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { TimeEntriesService } from './time-entries.service';

interface Row {
  id: string;
  userId: string;
  note: string;
  startedAt: Date;
  stoppedAt: Date | null;
  durationSec: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Minimal in-memory stand-in for the slice of PrismaClient the service uses, so the
 * single-running invariant and user-scoping are tested without a database.
 */
function makeFakePrisma() {
  const rows: Row[] = [];
  let seq = 0;

  const matches = (row: Row, where: Record<string, unknown> = {}): boolean => {
    if ('id' in where) {
      const idW = where.id as string | { not: string };
      if (typeof idW === 'string') {
        if (row.id !== idW) return false;
      } else if (row.id === idW.not) {
        return false;
      }
    }
    if ('userId' in where && row.userId !== where.userId) return false;
    if (
      'stoppedAt' in where &&
      where.stoppedAt === null &&
      row.stoppedAt !== null
    ) {
      return false;
    }
    return true;
  };

  const client = {
    timeEntry: {
      create: ({
        data,
      }: {
        data: Omit<Row, 'id' | 'createdAt' | 'updatedAt'>;
      }) => {
        const now = new Date();
        const row: Row = {
          ...data,
          id: `e${++seq}`,
          createdAt: now,
          updatedAt: now,
        };
        rows.push(row);
        return Promise.resolve(row);
      },
      findFirst: ({ where }: { where?: Record<string, unknown> }) =>
        Promise.resolve(rows.find((r) => matches(r, where)) ?? null),
      findMany: ({ where }: { where?: Record<string, unknown> }) =>
        Promise.resolve(rows.filter((r) => matches(r, where))),
      update: ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<Row>;
      }) => {
        const row = rows.find((r) => r.id === where.id);
        if (!row) throw new Error('not found');
        Object.assign(row, data, { updatedAt: new Date() });
        return Promise.resolve(row);
      },
      delete: ({ where }: { where: { id: string } }) => {
        const i = rows.findIndex((r) => r.id === where.id);
        rows.splice(i, 1);
        return Promise.resolve();
      },
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(client),
  };
  return { client, rows };
}

function makeService() {
  const { client, rows } = makeFakePrisma();
  const service = new TimeEntriesService(client as unknown as PrismaService);
  return { service, rows };
}

describe('TimeEntriesService', () => {
  it('keeps at most one running entry when starting again (FR-ENTRY-03)', async () => {
    const { service, rows } = makeService();
    await service.start('u1', { note: 'first' });
    await service.start('u1', { note: 'second' });

    const running = rows.filter(
      (r) => r.userId === 'u1' && r.stoppedAt === null,
    );
    expect(running).toHaveLength(1);
    expect(running[0].note).toBe('second');
    // The previous entry was stopped with a computed duration.
    const stopped = rows.find((r) => r.note === 'first');
    expect(stopped?.stoppedAt).not.toBeNull();
    expect(stopped?.durationSec).not.toBeNull();
  });

  it('continue copies the note and stops the prior running entry (FR-ENTRY-08)', async () => {
    const { service, rows } = makeService();
    const source = await service.createManual('u1', {
      note: 'design',
      startedAt: '2026-06-01T09:00:00.000Z',
      stoppedAt: '2026-06-01T10:00:00.000Z',
    });
    await service.start('u1', { note: 'other' });
    const cont = await service.continue('u1', source.id);

    expect(cont.note).toBe('design');
    expect(cont.stoppedAt).toBeNull();
    expect(rows.filter((r) => r.stoppedAt === null)).toHaveLength(1);
  });

  it('does not let one user touch another user’s entry (BC-SCOPE-01)', async () => {
    const { service } = makeService();
    const mine = await service.start('u1', { note: 'mine' });
    await expect(service.stop('u2', mine.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.remove('u2', mine.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a manual entry whose end is not after its start (FR-ENTRY-04)', async () => {
    const { service } = makeService();
    await expect(
      service.createManual('u1', {
        note: 'bad',
        startedAt: '2026-06-01T10:00:00.000Z',
        stoppedAt: '2026-06-01T10:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('computes duration on stop (FR-ENTRY-02)', async () => {
    const { service, rows } = makeService();
    const started = await service.start('u1', {
      note: 'work',
      startedAt: new Date(Date.now() - 90_000).toISOString(),
    });
    const stopped = await service.stop('u1', started.id);
    expect(stopped.durationSec).toBeGreaterThanOrEqual(89);
    expect(rows[0].stoppedAt).not.toBeNull();
  });

  it('rejects stopping an entry that is not running', async () => {
    const { service } = makeService();
    const manual = await service.createManual('u1', {
      note: 'done',
      startedAt: '2026-06-01T09:00:00.000Z',
      stoppedAt: '2026-06-01T10:00:00.000Z',
    });
    await expect(service.stop('u1', manual.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
