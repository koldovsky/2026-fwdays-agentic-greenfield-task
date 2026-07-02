import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { TimeEntriesService } from './time-entries.service';

interface TagRow {
  id: string;
  userId: string;
  name: string;
  color: string | null;
}

interface Row {
  id: string;
  userId: string;
  note: string;
  startedAt: Date;
  stoppedAt: Date | null;
  durationSec: number | null;
  tags: TagRow[];
  createdAt: Date;
  updatedAt: Date;
}

interface Relation {
  connect?: { id: string }[];
  set?: { id: string }[];
}

/**
 * In-memory stand-in for the slice of PrismaClient the service uses, tag-aware so the
 * single-running invariant, user-scoping, and tag copying/assignment are testable without
 * a database. `seedTags` pre-populates the user's tag store.
 */
function makeFakePrisma(seedTags: TagRow[] = []) {
  const rows: Row[] = [];
  const tags: TagRow[] = [...seedTags];
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

  const resolveTags = (rel?: Relation): TagRow[] | undefined => {
    if (!rel) return undefined;
    const refs = rel.set ?? rel.connect ?? [];
    return refs
      .map((r) => tags.find((t) => t.id === r.id))
      .filter((t): t is TagRow => !!t);
  };

  const scalars = (data: Record<string, unknown>): Partial<Row> => {
    const { tags: _t, ...rest } = data;
    void _t;
    return rest;
  };

  const client = {
    timeEntry: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        const now = new Date();
        const row: Row = {
          note: '',
          userId: '',
          startedAt: now,
          stoppedAt: null,
          durationSec: null,
          ...scalars(data),
          tags: resolveTags(data.tags as Relation) ?? [],
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
        data: Record<string, unknown>;
      }) => {
        const row = rows.find((r) => r.id === where.id);
        if (!row) throw new Error('not found');
        const nextTags = resolveTags(data.tags as Relation);
        Object.assign(row, scalars(data), { updatedAt: new Date() });
        if (nextTags) row.tags = nextTags;
        return Promise.resolve(row);
      },
      delete: ({ where }: { where: { id: string } }) => {
        const i = rows.findIndex((r) => r.id === where.id);
        rows.splice(i, 1);
        return Promise.resolve();
      },
    },
    tag: {
      findMany: ({
        where,
      }: {
        where: { userId: string; id: { in: string[] } };
      }) =>
        Promise.resolve(
          tags
            .filter(
              (t) => t.userId === where.userId && where.id.in.includes(t.id),
            )
            .map((t) => ({ id: t.id })),
        ),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn(client),
  };
  return { client, rows };
}

function makeService(seedTags: TagRow[] = []) {
  const { client, rows } = makeFakePrisma(seedTags);
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

  it('continue copies the source entry’s tags (FR-ENTRY-08, FR-TAG-02)', async () => {
    const designTag: TagRow = {
      id: 't1',
      userId: 'u1',
      name: 'Design',
      color: null,
    };
    const { service } = makeService([designTag]);
    const source = await service.createManual('u1', {
      note: 'design',
      startedAt: '2026-06-01T09:00:00.000Z',
      stoppedAt: '2026-06-01T10:00:00.000Z',
      tagIds: ['t1'],
    });
    expect(source.tags.map((t) => t.id)).toEqual(['t1']);

    const cont = await service.continue('u1', source.id);
    expect(cont.tags.map((t) => t.id)).toEqual(['t1']);
  });

  it('assigns only the user’s own tags; sets and clears on update (FR-TAG-02)', async () => {
    const mine: TagRow = { id: 't1', userId: 'u1', name: 'Mine', color: null };
    const foreign: TagRow = {
      id: 't2',
      userId: 'u2',
      name: 'Foreign',
      color: null,
    };
    const { service } = makeService([mine, foreign]);

    const created = await service.start('u1', {
      note: 'work',
      tagIds: ['t1', 't2'],
    });
    expect(created.tags.map((t) => t.id)).toEqual(['t1']); // foreign dropped

    const stopped = await service.stop('u1', created.id);
    const cleared = await service.update('u1', stopped.id, { tagIds: [] });
    expect(cleared.tags).toEqual([]);
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
