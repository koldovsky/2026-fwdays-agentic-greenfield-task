import { createHmac } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuthConfig } from './auth-config';
import { AuthError } from './auth-errors';
import { OTP_DAILY_LIMIT, OtpService } from './otp.service';
import { SmsSender } from './sms/sms-sender';

const config: AuthConfig = {
  authSecret: 'test-secret',
  smsMode: 'dev',
  turbosmsSender: 'Msg',
  cookieSecure: false,
  sessionTtlMs: 30 * 24 * 60 * 60 * 1000,
  otpTtlMs: 5 * 60 * 1000,
};

const PHONE = '+380671234567';

function hash(code: string, phone = PHONE): string {
  return createHmac('sha256', config.authSecret)
    .update(`${phone}:${code}`)
    .digest('hex');
}

function activeCodeRow(code: string, overrides: object = {}) {
  return {
    id: BigInt(1),
    phone: PHONE,
    codeHash: hash(code),
    expiresAt: new Date(Date.now() + 60_000),
    attempts: 0,
    consumedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

async function expectAuthError(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(AuthError);
  await promise.catch((e: AuthError) => {
    expect((e.getResponse() as { code: string }).code).toBe(code);
  });
}

describe('OtpService', () => {
  const prismaMock = {
    otpCode: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: { upsert: jest.fn() },
  };
  const smsMock: jest.Mocked<SmsSender> = { send: jest.fn() };
  let service: OtpService;

  beforeEach(() => {
    jest.resetAllMocks();
    prismaMock.otpCode.findMany.mockResolvedValue([]);
    service = new OtpService(
      prismaMock as unknown as PrismaService,
      smsMock,
      config,
    );
  });

  describe('requestOtp', () => {
    it('rejects an invalid phone without sending', async () => {
      await expectAuthError(service.requestOtp('12345'), 'PHONE_INVALID');
      expect(smsMock.send).not.toHaveBeenCalled();
    });

    it('sends a 6-digit code and stores only its hash (dev mode returns devCode)', async () => {
      const result = await service.requestOtp('067 123 45 67');

      expect(result.devCode).toMatch(/^\d{6}$/);
      expect(smsMock.send).toHaveBeenCalledWith(PHONE, result.devCode);
      const created = prismaMock.otpCode.create.mock.calls[0][0].data;
      expect(created.phone).toBe(PHONE);
      expect(created.codeHash).toBe(hash(result.devCode as string));
      expect(created.codeHash).not.toContain(result.devCode);
      expect(created.expiresAt.getTime()).toBeLessThanOrEqual(
        Date.now() + config.otpTtlMs,
      );
    });

    it('omits devCode outside dev mode', async () => {
      service = new OtpService(
        prismaMock as unknown as PrismaService,
        smsMock,
        { ...config, smsMode: 'turbosms' },
      );
      await expect(service.requestOtp(PHONE)).resolves.toEqual({});
    });

    it('supersedes previous active codes (only the latest is valid)', async () => {
      await service.requestOtp(PHONE);
      expect(prismaMock.otpCode.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { phone: PHONE, consumedAt: null },
          data: { consumedAt: expect.any(Date) },
        }),
      );
    });

    it('refuses a second code within 60s (FR-AUTH-03)', async () => {
      prismaMock.otpCode.findMany.mockResolvedValue([
        { createdAt: new Date(Date.now() - 10_000) },
      ]);
      await expectAuthError(service.requestOtp(PHONE), 'RATE_LIMITED_60S');
      expect(smsMock.send).not.toHaveBeenCalled();
    });

    it('refuses the 6th code in 24h (FR-AUTH-03)', async () => {
      prismaMock.otpCode.findMany.mockResolvedValue(
        Array.from({ length: OTP_DAILY_LIMIT }, (_, i) => ({
          createdAt: new Date(Date.now() - (i + 2) * 60_000),
        })),
      );
      await expectAuthError(service.requestOtp(PHONE), 'RATE_LIMITED_DAILY');
      expect(smsMock.send).not.toHaveBeenCalled();
    });

    it('does not record a code when the SMS send fails', async () => {
      smsMock.send.mockRejectedValue(new Error('gateway down'));
      await expect(service.requestOtp(PHONE)).rejects.toThrow('gateway down');
      expect(prismaMock.otpCode.create).not.toHaveBeenCalled();
      expect(prismaMock.otpCode.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('verifyOtp', () => {
    it('fails with OTP_EXPIRED_OR_MISSING when no active code exists', async () => {
      prismaMock.otpCode.findFirst.mockResolvedValue(null);
      await expectAuthError(
        service.verifyOtp(PHONE, '123456'),
        'OTP_EXPIRED_OR_MISSING',
      );
    });

    it('fails when the active code is past its TTL (FR-AUTH-02)', async () => {
      prismaMock.otpCode.findFirst.mockResolvedValue(
        activeCodeRow('123456', { expiresAt: new Date(Date.now() - 1000) }),
      );
      await expectAuthError(
        service.verifyOtp(PHONE, '123456'),
        'OTP_EXPIRED_OR_MISSING',
      );
    });

    it('logs in and upserts the account on the correct code (FR-AUTH-01)', async () => {
      prismaMock.otpCode.findFirst.mockResolvedValue(activeCodeRow('123456'));
      const user = { id: BigInt(7), phone: PHONE, name: null };
      prismaMock.user.upsert.mockResolvedValue(user);

      await expect(service.verifyOtp(PHONE, '123456')).resolves.toBe(user);

      // single-use: the code is consumed on success
      expect(prismaMock.otpCode.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: BigInt(1) },
          data: { consumedAt: expect.any(Date) },
        }),
      );
      expect(prismaMock.user.upsert).toHaveBeenCalledWith({
        where: { phone: PHONE },
        update: {},
        create: { phone: PHONE },
      });
    });

    it('increments attempts atomically on a wrong code and keeps the code alive', async () => {
      prismaMock.otpCode.findFirst.mockResolvedValue(
        activeCodeRow('123456', { attempts: 2 }),
      );
      prismaMock.otpCode.update.mockResolvedValue(
        activeCodeRow('123456', { attempts: 3 }),
      );
      await expectAuthError(service.verifyOtp(PHONE, '000000'), 'OTP_INVALID');
      expect(prismaMock.otpCode.update).toHaveBeenCalledTimes(1);
      expect(prismaMock.otpCode.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { attempts: { increment: 1 } } }),
      );
    });

    it('invalidates the code on the 5th failed attempt (FR-AUTH-02)', async () => {
      prismaMock.otpCode.findFirst.mockResolvedValue(
        activeCodeRow('123456', { attempts: 4 }),
      );
      prismaMock.otpCode.update.mockResolvedValueOnce(
        activeCodeRow('123456', { attempts: 5 }),
      );
      await expectAuthError(
        service.verifyOtp(PHONE, '000000'),
        'OTP_ATTEMPTS_EXCEEDED',
      );
      expect(prismaMock.otpCode.update).toHaveBeenLastCalledWith(
        expect.objectContaining({
          data: { consumedAt: expect.any(Date) },
        }),
      );
    });

    it('rejects a malformed code without crashing on hash length', async () => {
      prismaMock.otpCode.findFirst.mockResolvedValue(activeCodeRow('123456'));
      prismaMock.otpCode.update.mockResolvedValue(
        activeCodeRow('123456', { attempts: 1 }),
      );
      await expectAuthError(service.verifyOtp(PHONE, 'abc'), 'OTP_INVALID');
    });
  });

  describe('per-phone serialization (slice-review fix, ADR-0010)', () => {
    it('concurrent requestOtp calls cannot bypass the rate limit', async () => {
      // Stateful mock: findMany reflects rows created so far, so the test
      // fails if the calls interleave instead of running one-by-one
      const rows: { createdAt: Date }[] = [];
      prismaMock.otpCode.findMany.mockImplementation(async () => [...rows]);
      prismaMock.otpCode.create.mockImplementation(
        async (args: { data: object }) => {
          rows.push({ createdAt: new Date() });
          return args.data;
        },
      );

      const results = await Promise.allSettled([
        service.requestOtp(PHONE),
        service.requestOtp(PHONE),
        service.requestOtp(PHONE),
      ]);

      const sent = results.filter((r) => r.status === 'fulfilled');
      expect(sent).toHaveLength(1);
      expect(smsMock.send).toHaveBeenCalledTimes(1);
      expect(rows).toHaveLength(1);
    });
  });
});
