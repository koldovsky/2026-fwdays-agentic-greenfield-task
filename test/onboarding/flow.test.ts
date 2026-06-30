import { describe, expect, it } from 'vitest';
import { createOnboardingService } from '../../src/onboarding/flow.js';
import { AnswerStatus, type OnboardingClient } from '../../src/onboarding/types.js';

interface UserRow {
  id: number;
  chatId: bigint;
  age: number | null;
  sex: string | null;
  heightCm: number | null;
  goal: string | null;
  activity: string | null;
  tz: string;
  targetKcal: number | null;
  targetProteinG: number | null;
  targetFatG: number | null;
  targetCarbsG: number | null;
}

interface MetricRow {
  id: number;
  userId: number;
  date: Date;
  weightKg: number | null;
}

// In-memory stand-in for the two Prisma delegates the flow touches — the DB IS the state machine,
// so a fresh service over the same store models a process restart (ADR-0016).
const makeFake = (): { client: OnboardingClient; users: UserRow[]; metrics: MetricRow[] } => {
  const users: UserRow[] = [];
  const metrics: MetricRow[] = [];
  let userSeq = 0;
  let metricSeq = 0;

  const client = {
    user: {
      findUnique: ({ where }: { where: { chatId?: bigint; id?: number } }) =>
        Promise.resolve(
          users.find((u) =>
            where.chatId !== undefined ? u.chatId === where.chatId : u.id === where.id,
          ) ?? null,
        ),
      create: ({ data }: { data: { chatId: bigint; tz?: string } }) => {
        const u: UserRow = {
          id: ++userSeq,
          chatId: data.chatId,
          age: null,
          sex: null,
          heightCm: null,
          goal: null,
          activity: null,
          tz: data.tz ?? 'Europe/Kyiv',
          targetKcal: null,
          targetProteinG: null,
          targetFatG: null,
          targetCarbsG: null,
        };
        users.push(u);
        return Promise.resolve(u);
      },
      // Atomic find-or-create — mirrors prisma.user.upsert; never inserts a duplicate chatId.
      upsert: ({ where, create }: { where: { chatId: bigint }; create: { chatId: bigint } }) => {
        const existing = users.find((u) => u.chatId === where.chatId);
        if (existing) {
          return Promise.resolve(existing);
        }
        const u: UserRow = {
          id: ++userSeq,
          chatId: create.chatId,
          age: null,
          sex: null,
          heightCm: null,
          goal: null,
          activity: null,
          tz: 'Europe/Kyiv',
          targetKcal: null,
          targetProteinG: null,
          targetFatG: null,
          targetCarbsG: null,
        };
        users.push(u);
        return Promise.resolve(u);
      },
      update: ({ where, data }: { where: { id: number }; data: Record<string, unknown> }) => {
        const u = users.find((x) => x.id === where.id);
        if (u) Object.assign(u, data);
        return Promise.resolve(u);
      },
    },
    bodyMetric: {
      findFirst: ({ where }: { where: { userId: number } }) => {
        const found = metrics.filter((m) => m.userId === where.userId && m.weightKg !== null);
        return Promise.resolve(found.length ? found[found.length - 1] : null);
      },
      create: ({ data }: { data: { userId: number; date: Date; weightKg: number } }) => {
        const m: MetricRow = {
          id: ++metricSeq,
          userId: data.userId,
          date: data.date,
          weightKg: data.weightKg,
        };
        metrics.push(m);
        return Promise.resolve(m);
      },
    },
  } as unknown as OnboardingClient;

  return { client, users, metrics };
};

const CHAT = 555n;

describe('onboarding flow', () => {
  it('asks the first question on a new chat and resolves the next field in order', async () => {
    const { client } = makeFake();
    const svc = createOnboardingService(client);

    const start = await svc.startSession(CHAT);
    expect(start.question?.field).toBe('age');

    expect((await svc.submitAnswer(CHAT, '30')).status).toBe(AnswerStatus.NEXT);
    const afterAge = await svc.submitAnswer(CHAT, 'not-a-sex-option'); // current is sex (choice)
    expect(afterAge.status).toBe(AnswerStatus.INVALID);
    if (afterAge.status === AnswerStatus.INVALID) {
      expect(afterAge.question.field).toBe('sex');
    }
  });

  it('resumes mid-flow after a restart (state from the DB, not chat history)', async () => {
    const { client } = makeFake();
    await createOnboardingService(client).startSession(CHAT); // creates the row
    await createOnboardingService(client).submitAnswer(CHAT, '30'); // age
    await createOnboardingService(client).submitAnswer(CHAT, 'male'); // sex

    // A brand-new service instance (simulated restart) must resume at height, not re-ask age.
    const resumed = await createOnboardingService(client).startSession(CHAT);
    expect(resumed.question?.field).toBe('heightCm');
  });

  it('does not persist an out-of-range numeric answer and re-asks', async () => {
    const { client, users } = makeFake();
    const svc = createOnboardingService(client);
    await svc.startSession(CHAT);

    const bad = await svc.submitAnswer(CHAT, '999'); // age max is 100
    expect(bad.status).toBe(AnswerStatus.INVALID);
    expect(users[0]?.age).toBeNull();

    const ok = await svc.submitAnswer(CHAT, '30');
    expect(ok.status).toBe(AnswerStatus.NEXT);
    expect(users[0]?.age).toBe(30);
  });

  it('rejects a decimal for an integer field (age/height are Int columns) instead of 400ing', async () => {
    const { client, users } = makeFake();
    const svc = createOnboardingService(client);
    await svc.startSession(CHAT);

    const bad = await svc.submitAnswer(CHAT, '30.5'); // in range, but not an integer
    expect(bad.status).toBe(AnswerStatus.INVALID);
    expect(users[0]?.age).toBeNull();
  });

  it('writes weight to body_metrics scoped to the user, keeps literals English', async () => {
    const { client, users, metrics } = makeFake();
    const svc = createOnboardingService(client);
    await svc.startSession(CHAT);
    await svc.submitAnswer(CHAT, '30'); // age
    await svc.submitAnswer(CHAT, 'male'); // sex — English literal
    await svc.submitAnswer(CHAT, '180'); // height
    await svc.submitAnswer(CHAT, '80'); // weight

    expect(users[0]?.sex).toBe('male'); // stored English, not localized
    expect(metrics).toHaveLength(1);
    expect(metrics[0]?.weightKg).toBe(80);
    expect(metrics[0]?.userId).toBe(users[0]?.id); // tenant-scoped (invariant #8)
  });

  it('computes and persists targets when the final question (tz) is answered', async () => {
    const { client, users } = makeFake();
    const svc = createOnboardingService(client);
    await svc.startSession(CHAT);
    await svc.submitAnswer(CHAT, '30');
    await svc.submitAnswer(CHAT, 'male');
    await svc.submitAnswer(CHAT, '180');
    await svc.submitAnswer(CHAT, '80');
    await svc.submitAnswer(CHAT, 'cut');
    await svc.submitAnswer(CHAT, 'moderate');
    const done = await svc.submitAnswer(CHAT, 'Europe/Kyiv');

    expect(done.status).toBe(AnswerStatus.COMPLETE);
    if (done.status === AnswerStatus.COMPLETE) {
      expect(done.targets.kcal).toBeGreaterThan(0);
    }
    expect(users[0]?.targetKcal).toBeGreaterThan(0);
    expect(await svc.isOnboarding(CHAT)).toBe(false);
  });

  it('greets a returning, fully-onboarded chat with stored targets (no question)', async () => {
    const { client, users } = makeFake();
    const svc = createOnboardingService(client);
    await svc.startSession(CHAT);
    for (const a of ['30', 'male', '180', '80', 'cut', 'moderate', 'Europe/Kyiv']) {
      await svc.submitAnswer(CHAT, a);
    }
    const again = await svc.startSession(CHAT);
    expect(again.question).toBeNull();
    expect(again.targets?.kcal).toBe(users[0]?.targetKcal);
  });
});
