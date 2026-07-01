'use strict';

const CONFIG = { poll: { cronExpression: '*/15 * * * *' }, siebel: { concurrency: 3 }, ai: {} };

let fetchWorkspaces, upsertWorkspaces, processPendingWorkspaces, logger, runCycle, startScheduler;

beforeEach(() => {
  jest.resetModules();
  delete process.env.CRON_ENABLED;

  jest.mock('node-cron', () => ({ schedule: jest.fn() }));
  jest.mock('../src/siebel/workspaces', () => ({ fetchWorkspaces: jest.fn() }));
  jest.mock('../src/state/store',        () => ({ upsertWorkspaces: jest.fn() }));
  jest.mock('../src/processor',          () => ({ processPendingWorkspaces: jest.fn() }));
  jest.mock('../src/utils/logger',       () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

  fetchWorkspaces        = require('../src/siebel/workspaces').fetchWorkspaces;
  upsertWorkspaces       = require('../src/state/store').upsertWorkspaces;
  processPendingWorkspaces = require('../src/processor').processPendingWorkspaces;
  logger                 = require('../src/utils/logger');
  ({ runCycle, startScheduler } = require('../src/scheduler'));

  fetchWorkspaces.mockResolvedValue([]);
  upsertWorkspaces.mockResolvedValue();
  processPendingWorkspaces.mockResolvedValue();
});

describe('runCycle — успішний цикл', () => {
  it('викликає fetchWorkspaces → upsertWorkspaces → processPendingWorkspaces', async () => {
    await runCycle(CONFIG);
    expect(fetchWorkspaces).toHaveBeenCalledTimes(1);
    expect(upsertWorkspaces).toHaveBeenCalledTimes(1);
    expect(processPendingWorkspaces).toHaveBeenCalledWith(CONFIG);
  });
});

describe('runCycle — isRunning lock', () => {
  it('другий виклик під час виконання першого — пропускається', async () => {
    let resolveFirst;
    fetchWorkspaces.mockReturnValueOnce(new Promise(resolve => { resolveFirst = resolve; }));

    const first = runCycle(CONFIG);
    const second = runCycle(CONFIG); // має одразу повернутись (isRunning=true)

    resolveFirst([]);
    await Promise.all([first, second]);

    expect(fetchWorkspaces).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('skipping')
    );
  });

  it('після завершення першого циклу — наступний runCycle виконується', async () => {
    await runCycle(CONFIG);
    await runCycle(CONFIG);
    expect(fetchWorkspaces).toHaveBeenCalledTimes(2);
  });
});

describe('runCycle — обробка помилок', () => {
  it('помилка у fetchWorkspaces → логується, isRunning скидається', async () => {
    fetchWorkspaces.mockRejectedValue(new Error('Siebel down'));

    await expect(runCycle(CONFIG)).resolves.not.toThrow();
    expect(logger.error).toHaveBeenCalledWith('Cycle failed', expect.objectContaining({ error: 'Siebel down' }));

    // isRunning скинуто — наступний цикл виконується
    fetchWorkspaces.mockResolvedValue([]);
    await runCycle(CONFIG);
    expect(fetchWorkspaces).toHaveBeenCalledTimes(2);
  });
});

describe('startScheduler — CRON_ENABLED', () => {
  it('CRON_ENABLED не встановлено → cron не запускається, лог scheduler.disabled', () => {
    const cron = require('node-cron');
    startScheduler(CONFIG);
    expect(cron.schedule).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith('scheduler.disabled', expect.any(Object));
  });

  it('CRON_ENABLED=false → cron не запускається', () => {
    process.env.CRON_ENABLED = 'false';
    const cron = require('node-cron');
    startScheduler(CONFIG);
    expect(cron.schedule).not.toHaveBeenCalled();
  });

  it('CRON_ENABLED=true → cron.schedule викликається', () => {
    process.env.CRON_ENABLED = 'true';
    const cron = require('node-cron');
    startScheduler(CONFIG);
    expect(cron.schedule).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith('scheduler.started', expect.any(Object));
  });
});
