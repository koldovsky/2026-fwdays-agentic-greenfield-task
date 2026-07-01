import { describe, expect, it, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { createProgressService } from '../../src/progress/service.js';
import type { ProgressClient } from '../../src/progress/types.js';

// End-to-end service wiring over a fake Prisma + fake Anthropic: the happy path issues EXACTLY ONE
// vision call (invariant #5), writes ONE tenant-scoped progress_notes row (invariant #8) with the
// observations + no image field (invariants #2/#4 at rest), and returns the observations as the
// reply. An unknown chat_id short-circuits — no vision call, no write. A CRITICAL fs-spy test asserts
// ZERO disk writes across the full analyze → save run (invariant #4).

// fs write-path spies — mocked at module scope (ESM namespaces aren't spy-able post-import).
const { fsWriteFile, fsWriteFileSync, fsCreateWriteStream, fspWriteFile } = vi.hoisted(() => ({
  fsWriteFile: vi.fn(),
  fsWriteFileSync: vi.fn(),
  fsCreateWriteStream: vi.fn(),
  fspWriteFile: vi.fn(),
}));
vi.mock('node:fs', async (importActual) => {
  const actual = await importActual<Record<string, unknown>>();
  return {
    ...actual,
    writeFile: fsWriteFile,
    writeFileSync: fsWriteFileSync,
    createWriteStream: fsCreateWriteStream,
  };
});
vi.mock('node:fs/promises', async (importActual) => {
  const actual = await importActual<Record<string, unknown>>();
  return { ...actual, writeFile: fspWriteFile };
});

interface Capture {
  data: Record<string, unknown>;
}

const OBSERVATIONS = 'Живот в профиль стал заметно площе, талия подтянулась.';

const makeAnthropic = (): { client: Anthropic; create: ReturnType<typeof vi.fn> } => {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({ observations: OBSERVATIONS }) }],
    usage: { cache_read_input_tokens: 0 },
  });
  return { client: { messages: { create } } as unknown as Anthropic, create };
};

const makeClient = (userId: number | null = 7): { client: ProgressClient; created: Capture[] } => {
  const created: Capture[] = [];
  const client = {
    user: { findUnique: vi.fn().mockResolvedValue(userId === null ? null : { id: userId }) },
    progressNote: {
      create: vi.fn((args: Capture) => {
        created.push(args);
        return Promise.resolve({ id: 1, ...args.data });
      }),
    },
  } as unknown as ProgressClient;
  return { client, created };
};

describe('createProgressService.analyzeAndSave', () => {
  it('happy path: one vision call, one tenant-scoped row, returns the observations', async () => {
    const { client, created } = makeClient();
    const { client: anthropic, create } = makeAnthropic();

    const reply = await createProgressService(
      client,
      anthropic,
      'Europe/Kyiv',
      () => new Date('2026-07-01T09:00:00.000Z'),
    ).analyzeAndSave(99n, 'мой прогресс', 'BASE64');

    expect(create).toHaveBeenCalledTimes(1); // exactly one vision call, no loop (invariant #5)
    expect(created).toHaveLength(1); // one row
    const row = created[0]?.data;
    expect(row?.userId).toBe(7); // tenant-scoped (invariant #8)
    expect(row?.observations).toBe(OBSERVATIONS);
    expect(row?.date).toEqual(new Date('2026-07-01T00:00:00.000Z')); // today in user TZ
    expect(row).not.toHaveProperty('image'); // no image at rest (invariant #4)
    expect(reply?.text).toBe(OBSERVATIONS); // the prose is the reply (language decided by the model)
  });

  it('returns null for an unknown chat_id — no vision call, no write', async () => {
    const { client, created } = makeClient(null);
    const { client: anthropic, create } = makeAnthropic();

    const reply = await createProgressService(client, anthropic, 'Europe/Kyiv').analyzeAndSave(
      99n,
      '',
      'BASE64',
    );

    expect(reply).toBeNull();
    expect(create).not.toHaveBeenCalled();
    expect(created).toHaveLength(0);
  });

  it('CRITICAL — writes nothing to disk across the full analyze → save run (invariant #4)', async () => {
    const { client } = makeClient();
    const { client: anthropic } = makeAnthropic();

    await createProgressService(client, anthropic, 'Europe/Kyiv').analyzeAndSave(
      99n,
      'мой прогресс',
      'BASE64',
    );

    expect(fsWriteFile).not.toHaveBeenCalled();
    expect(fsWriteFileSync).not.toHaveBeenCalled();
    expect(fsCreateWriteStream).not.toHaveBeenCalled();
    expect(fspWriteFile).not.toHaveBeenCalled();
  });
});
