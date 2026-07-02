import { ConflictException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { TagsService } from './tags.service';

interface TagRow {
  id: string;
  userId: string;
  name: string;
  color: string | null;
}

/** In-memory stand-in for the tag slice of PrismaClient. */
function makeFakePrisma() {
  const rows: TagRow[] = [];
  let seq = 0;

  const client = {
    tag: {
      findMany: ({
        where,
        orderBy,
      }: {
        where: { userId: string };
        orderBy?: unknown;
      }) => {
        void orderBy;
        return Promise.resolve(rows.filter((r) => r.userId === where.userId));
      },
      findFirst: ({ where }: { where: Record<string, unknown> }) => {
        const userId = where.userId as string;
        return Promise.resolve(
          rows.find((r) => {
            if (r.userId !== userId) return false;
            if ('id' in where) {
              const idW = where.id as string | { not: string };
              if (typeof idW === 'string') return r.id === idW;
              if (r.id === idW.not) return false;
            }
            if ('name' in where) {
              const nameW = where.name as { equals: string; mode?: string };
              if (r.name.toLowerCase() !== nameW.equals.toLowerCase())
                return false;
            }
            return true;
          }) ?? null,
        );
      },
      create: ({ data }: { data: Omit<TagRow, 'id'> }) => {
        const row: TagRow = { ...data, id: `t${++seq}` };
        rows.push(row);
        return Promise.resolve(row);
      },
      update: ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<TagRow>;
      }) => {
        const row = rows.find((r) => r.id === where.id);
        if (!row) throw new Error('not found');
        Object.assign(row, data);
        return Promise.resolve(row);
      },
      delete: ({ where }: { where: { id: string } }) => {
        const i = rows.findIndex((r) => r.id === where.id);
        rows.splice(i, 1);
        return Promise.resolve();
      },
    },
  };
  return { client, rows };
}

function makeService() {
  const { client, rows } = makeFakePrisma();
  return { service: new TagsService(client as unknown as PrismaService), rows };
}

describe('TagsService', () => {
  it('creates a tag and rejects a case-insensitive duplicate (FR-TAG-01)', async () => {
    const { service } = makeService();
    await service.create('u1', { name: 'Design', color: '#F5A300' });
    await expect(
      service.create('u1', { name: 'design' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lets different users share a tag name', async () => {
    const { service } = makeService();
    await service.create('u1', { name: 'Design' });
    await expect(
      service.create('u2', { name: 'Design' }),
    ).resolves.toMatchObject({
      name: 'Design',
    });
  });

  it('renames a tag', async () => {
    const { service } = makeService();
    const tag = await service.create('u1', { name: 'Admin' });
    const renamed = await service.update('u1', tag.id, { name: 'Ops' });
    expect(renamed.name).toBe('Ops');
  });

  it('does not let one user touch another user’s tag (BC-SCOPE-01)', async () => {
    const { service } = makeService();
    const tag = await service.create('u1', { name: 'Mine' });
    await expect(
      service.update('u2', tag.id, { name: 'Hijack' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('u2', tag.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deletes a tag (detach is Prisma’s job; entries are untouched — FR-TAG-03)', async () => {
    const { service, rows } = makeService();
    const tag = await service.create('u1', { name: 'Temp' });
    await service.remove('u1', tag.id);
    expect(rows).toHaveLength(0);
  });
});
