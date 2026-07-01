'use strict';

const ALL_ENV = {
  SIEBEL_BASE_URL:   'https://siebel.example.com',
  SIEBEL_USERNAME:   'user',
  SIEBEL_PASSWORD:   'pass',
  JIRA_BASE_URL:     'https://jira.example.com',
  JIRA_API_TOKEN:    'token',
  JIRA_PROJECT_KEY:  'SBL',
  WEBHOOK_API_TOKEN: 'webhook-secret',
};

const MOCK_APP = { listen: jest.fn((port, cb) => cb && cb()) };

let exitSpy;
let startScheduler;

function setupMocks() {
  jest.resetModules();
  jest.mock('dotenv',              () => ({ config: jest.fn() }));
  jest.mock('../src/scheduler',    () => ({ startScheduler: jest.fn() }));
  jest.mock('../src/api/server',   () => ({ createServer: jest.fn(() => MOCK_APP) }));
  jest.mock('../src/utils/logger', () => ({ info: jest.fn(), error: jest.fn() }));
  jest.mock('../config/default',   () => ({ poll: { cronExpression: '*/15 * * * *' }, siebel: {}, ai: {}, port: 5000 }));
  exitSpy        = jest.spyOn(process, 'exit').mockImplementation(() => {});
  startScheduler = require('../src/scheduler').startScheduler;
}

function setEnv(overrides = {}) {
  const vars = { ...ALL_ENV, ...overrides };
  Object.entries(vars).forEach(([k, v]) => {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  });
}

afterEach(() => {
  exitSpy?.mockRestore();
  Object.keys(ALL_ENV).forEach(k => delete process.env[k]);
  delete process.env.PORT;
  delete process.env.AI_PROVIDER;
  delete process.env.ANTHROPIC_API_KEY;
});

describe('index.js — відсутні env змінні → process.exit(1)', () => {
  const REQUIRED = [
    'SIEBEL_BASE_URL', 'SIEBEL_USERNAME', 'SIEBEL_PASSWORD',
    'JIRA_BASE_URL', 'JIRA_API_TOKEN', 'JIRA_PROJECT_KEY',
    'WEBHOOK_API_TOKEN',
  ];

  REQUIRED.forEach(missingKey => {
    it(`відсутній ${missingKey} → process.exit(1)`, () => {
      setupMocks();
      setEnv({ [missingKey]: undefined });
      require('../src/index');
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});

describe('index.js — AI_PROVIDER=claude без ANTHROPIC_API_KEY', () => {
  it('AI_PROVIDER=claude + відсутній ANTHROPIC_API_KEY → process.exit(1)', () => {
    setupMocks();
    setEnv();
    process.env.AI_PROVIDER = 'claude';
    require('../src/index');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('AI_PROVIDER=claude + ANTHROPIC_API_KEY є → нормальний старт', () => {
    setupMocks();
    setEnv();
    process.env.AI_PROVIDER      = 'claude';
    process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
    require('../src/index');
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('AI_PROVIDER=vertex (або не задано) → ANTHROPIC_API_KEY не обовязковий', () => {
    setupMocks();
    setEnv();
    process.env.AI_PROVIDER = 'vertex';
    require('../src/index');
    expect(exitSpy).not.toHaveBeenCalled();
  });
});

describe('index.js — всі env змінні є', () => {
  it('startScheduler викликається', () => {
    setupMocks();
    setEnv();
    require('../src/index');
    expect(exitSpy).not.toHaveBeenCalled();
    expect(startScheduler).toHaveBeenCalledTimes(1);
  });

  it('app.listen викликається з PORT або дефолтним портом', () => {
    setupMocks();
    setEnv();
    process.env.PORT = '4000';
    require('../src/index');
    expect(MOCK_APP.listen).toHaveBeenCalledWith('4000', expect.any(Function));
  });
});
