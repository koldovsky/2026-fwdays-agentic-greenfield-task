'use strict';

jest.mock('../src/siebel/client', () => ({
  apiCall: jest.fn(),
  buildSiebelHeaders: jest.fn(() => ({})),
}));

const { apiCall } = require('../src/siebel/client');
const {
  buildScriptsUrl,
  fetchAllServiceScripts,
  transformToReviewPayload,
} = require('../src/siebel/services');

beforeEach(() => {
  process.env.SIEBEL_BASE_URL = 'https://siebel.example.com';
  jest.clearAllMocks();
});

describe('buildScriptsUrl', () => {
  it('кодує workspaceName та serviceName через encodeURIComponent', () => {
    const url = buildScriptsUrl('dev test ws', 'My Service');
    expect(url).toContain('dev%20test%20ws');
    expect(url).toContain('My%20Service');
  });

  it('фіксовані частини мають %20 замість пробілів', () => {
    const url = buildScriptsUrl('ws', 'svc');
    expect(url).toContain('/Business%20Service/');
    expect(url).toContain('/Business%20Service%20Server%20Script');
  });

  it('використовує SIEBEL_BASE_URL з env', () => {
    const url = buildScriptsUrl('ws', 'svc');
    expect(url.startsWith('https://siebel.example.com')).toBe(true);
  });
});

describe('fetchAllServiceScripts — одна сторінка', () => {
  it('повертає items якщо lastpage: "true"', async () => {
    apiCall.mockResolvedValueOnce({ items: [{ Name: 'Init', Script: 'var x = 1;' }], lastpage: 'true' });

    const result = await fetchAllServiceScripts('ws1', 'SvcA');
    expect(result).toHaveLength(1);
    expect(result[0].Name).toBe('Init');
    expect(apiCall).toHaveBeenCalledTimes(1);
  });

  it('порожній items не кидає помилку', async () => {
    apiCall.mockResolvedValueOnce({ items: [], lastpage: 'true' });
    const result = await fetchAllServiceScripts('ws1', 'SvcA');
    expect(result).toEqual([]);
  });

  it('відсутній items не кидає помилку', async () => {
    apiCall.mockResolvedValueOnce({ lastpage: 'true' });
    const result = await fetchAllServiceScripts('ws1', 'SvcA');
    expect(result).toEqual([]);
  });
});

describe('fetchAllServiceScripts — пагінація', () => {
  it('робить другий запит якщо перша сторінка повна (20 items)', async () => {
    const page1 = Array.from({ length: 20 }, (_, i) => ({ Name: `Script${i}` }));
    apiCall
      .mockResolvedValueOnce({ items: page1, lastpage: 'false' })
      .mockResolvedValueOnce({ items: [{ Name: 'Execute' }], lastpage: 'true' });

    const result = await fetchAllServiceScripts('ws1', 'SvcA');
    expect(result).toHaveLength(21);
    expect(apiCall).toHaveBeenCalledTimes(2);
  });

  it('зупиняється якщо Siebel повертає lastpage: "true" (навіть якщо сторінка повна)', async () => {
    const page1 = Array.from({ length: 20 }, (_, i) => ({ Name: `Script${i}` }));
    apiCall.mockResolvedValueOnce({ items: page1, lastpage: 'true' });

    const result = await fetchAllServiceScripts('ws1', 'SvcA');
    expect(result).toHaveLength(20);
    expect(apiCall).toHaveBeenCalledTimes(1);
  });

  it('об\'єднує items з усіх сторінок у плоский масив', async () => {
    const page1 = Array.from({ length: 20 }, (_, i) => ({ Name: String.fromCharCode(65 + i) }));
    apiCall
      .mockResolvedValueOnce({ items: page1, lastpage: 'false' })
      .mockResolvedValueOnce({ items: [{ Name: 'U' }, { Name: 'V' }], lastpage: 'false' });

    const result = await fetchAllServiceScripts('ws1', 'SvcA');
    expect(result).toHaveLength(22);
    expect(result[0].Name).toBe('A');
    expect(result[21].Name).toBe('V');
  });
});

describe('transformToReviewPayload', () => {
  it('фільтрує Inactive: "Y"', () => {
    const items = [
      { Name: 'Init', Script: 'var x;', 'Parent Name': 'SvcA', Inactive: 'N' },
      { Name: 'Dead', Script: 'var y;', 'Parent Name': 'SvcA', Inactive: 'Y' },
    ];
    const result = transformToReviewPayload('ws1', items);
    expect(result.scripts).toHaveLength(1);
    expect(result.scripts[0].name).toBe('Init');
  });

  it('parentName береться з першого активного item', () => {
    const items = [
      { Name: 'Init', Script: '', 'Parent Name': 'MyService', Inactive: 'N' },
    ];
    const result = transformToReviewPayload('ws1', items);
    expect(result.parentName).toBe('MyService');
  });

  it('порожній масив → scripts: [], parentName: ""', () => {
    const result = transformToReviewPayload('ws1', []);
    expect(result).toEqual({ workspaceName: 'ws1', parentName: '', scripts: [] });
  });

  it('всі items Inactive → scripts: [], parentName: ""', () => {
    const items = [{ Name: 'Dead', Script: '', 'Parent Name': 'Svc', Inactive: 'Y' }];
    const result = transformToReviewPayload('ws1', items);
    expect(result.scripts).toEqual([]);
    expect(result.parentName).toBe('');
  });

  it('структура скрипту: { name, body }', () => {
    const items = [{ Name: 'Init', Script: 'var x = 1;', 'Parent Name': 'SvcA', Inactive: 'N' }];
    const result = transformToReviewPayload('ws1', items);
    expect(result.scripts[0]).toEqual({ name: 'Init', body: 'var x = 1;' });
  });
});
