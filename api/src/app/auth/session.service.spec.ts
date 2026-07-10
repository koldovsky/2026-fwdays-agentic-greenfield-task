import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthConfig } from './auth-config';
import { SessionService } from './session.service';

const config = {
  sessionTtlMs: 30 * 24 * 60 * 60 * 1000,
} as AuthConfig;

describe('SessionService', () => {
  const prismaMock = {
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  let service: SessionService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new SessionService(
      prismaMock as unknown as PrismaService,
      config,
    );
  });

  it('creates a session storing only the token hash, expiring in ~30 days (FR-AUTH-04)', async () => {
    const { token, expiresAt } = await service.create(BigInt(1));

    const stored = prismaMock.session.create.mock.calls[0][0].data;
    expect(stored.tokenHash).toBe(
      createHash('sha256').update(token).digest('hex'),
    );
    expect(stored.tokenHash).not.toBe(token);
    expect(token.length).toBeGreaterThanOrEqual(43); // 32 bytes base64url
    expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(
      29 * 24 * 60 * 60 * 1000,
    );
  });

  it('resolves the user for a live token and null for an expired one', async () => {
    const user = { id: BigInt(1), phone: '+380671234567', name: null };
    prismaMock.session.findUnique.mockResolvedValue({
      user,
      expiresAt: new Date(Date.now() + 1000),
    });
    await expect(service.findUserByToken('t')).resolves.toBe(user);

    prismaMock.session.findUnique.mockResolvedValue({
      user,
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(service.findUserByToken('t')).resolves.toBeNull();
  });

  it('revokes by token hash', async () => {
    await service.revoke('some-token');
    expect(prismaMock.session.deleteMany).toHaveBeenCalledWith({
      where: {
        tokenHash: createHash('sha256').update('some-token').digest('hex'),
      },
    });
  });
});
