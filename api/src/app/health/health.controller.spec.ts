import { HttpException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { HEALTH_DB_TIMEOUT_MS, HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  const prismaMock = { $queryRaw: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prismaMock }],
    }).compile();
    controller = module.get(HealthController);
  });

  it('returns ok/up when the DB responds', async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ '1': 1 }]);
    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      db: 'up',
    });
  });

  it('throws 503 with error/down when the DB is unreachable', async () => {
    prismaMock.$queryRaw.mockRejectedValue(new Error('connection refused'));
    const failure = controller.check();
    await expect(failure).rejects.toBeInstanceOf(HttpException);
    await failure.catch((e: HttpException) => {
      expect(e.getStatus()).toBe(503);
      expect(e.getResponse()).toEqual({ status: 'error', db: 'down' });
    });
  });

  it('fails fast with 503 when the DB query hangs past the probe timeout', async () => {
    jest.useFakeTimers();
    try {
      prismaMock.$queryRaw.mockReturnValue(new Promise(() => undefined));
      const failure = controller.check();
      const assertion = expect(failure).rejects.toBeInstanceOf(HttpException);
      await jest.advanceTimersByTimeAsync(HEALTH_DB_TIMEOUT_MS);
      await assertion;
      await failure.catch((e: HttpException) => {
        expect(e.getStatus()).toBe(503);
        expect(e.getResponse()).toEqual({ status: 'error', db: 'down' });
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
