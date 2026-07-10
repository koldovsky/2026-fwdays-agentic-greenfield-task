import {
  ConsoleLogger,
  Controller,
  Get,
  INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';

@Controller('boom')
class BoomController {
  @Get()
  boom(): never {
    throw new Error('kaboom (test)');
  }
}

// Design D3: no custom global filter — Nest's exceptions handler already
// logs unhandled errors with stack, and with the JSON logger that output is
// structured. This spec pins that inherited behavior against upgrades.
describe('unhandled error logging (spec: structured-logging)', () => {
  let app: INestApplication;
  let stderr: jest.SpyInstance;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BoomController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.useLogger(new ConsoleLogger({ json: true }));
    stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    await app.init();
    await app.listen(0);
  });

  afterAll(async () => {
    await app.close();
    stderr.mockRestore();
  });

  it('answers 500 and emits a structured error entry with the stack trace', async () => {
    const response = await fetch(`${await app.getUrl()}/boom`);
    expect(response.status).toBe(500);

    const errorLine = stderr.mock.calls
      .map(([chunk]) => String(chunk))
      .find((line) => line.includes('kaboom (test)'));
    expect(errorLine).toBeDefined();
    const entry = JSON.parse(errorLine as string);
    expect(entry.level).toBe('error');
    // Nest's exceptions handler emits the error's stack string as the
    // message — both the message and the frames live in that one field.
    expect(entry.message).toContain('Error: kaboom (test)');
    expect(entry.message).toContain('BoomController.boom');
  });
});
