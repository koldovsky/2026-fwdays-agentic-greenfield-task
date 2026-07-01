'use strict';

const { buildPrompt } = require('../src/vertex/reviewer');

const SAMPLE = {
  workspaceName: 'dev_test_ws',
  parentName: 'MyBusinessService',
  scripts: [
    { name: 'Init', body: 'function Init() { var x = 1; }' },
    { name: 'Execute', body: 'function Execute() { return; }' },
  ],
};

describe('buildPrompt — null guard', () => {
  it('повертає null якщо scripts порожній масив', () => {
    expect(buildPrompt({ ...SAMPLE, scripts: [] })).toBeNull();
  });

  it('повертає null якщо scripts undefined', () => {
    expect(buildPrompt({ workspaceName: 'ws', parentName: 'svc', scripts: undefined })).toBeNull();
  });

  it('повертає null якщо scripts не передано', () => {
    expect(buildPrompt({ workspaceName: 'ws', parentName: 'svc' })).toBeNull();
  });
});

describe('buildPrompt — структура результату', () => {
  let result;

  beforeAll(() => {
    result = buildPrompt(SAMPLE);
  });

  it('повертає рядок для непорожнього scripts', () => {
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('містить workspaceName', () => {
    expect(result).toContain('dev_test_ws');
  });

  it('містить parentName як заголовок Business Service', () => {
    expect(result).toContain('MyBusinessService');
  });

  it('містить назву кожного скрипту', () => {
    expect(result).toContain('Init');
    expect(result).toContain('Execute');
  });

  it('містить тіло кожного скрипту у code block', () => {
    expect(result).toContain('function Init()');
    expect(result).toContain('function Execute()');
    expect(result).toContain('```javascript');
  });

  it('містить секцію "Що перевірити"', () => {
    expect(result).toContain('Що перевірити');
  });

  it('містить секцію "Формат відповіді"', () => {
    expect(result).toContain('Формат відповіді');
  });
});
