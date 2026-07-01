'use strict';

const { parseWorkspacesResponse } = require('../src/siebel/workspaces');

const makeResponse = (workspaces = [], errorCode = '0', errorMessage = '') => ({
  errorCode,
  errorMessage,
  Workspace: workspaces,
});

const makeWs = (name, versions = []) => ({
  Name: name,
  Status: 'Delivered',
  CreatedByName: 'TESTUSER',
  Version: versions,
});

const makeVer = (objects) => ({ VerNum: '1', Comments: '', Object: objects });

describe('parseWorkspacesResponse — errorCode', () => {
  it('кидає Error якщо errorCode !== "0"', () => {
    expect(() =>
      parseWorkspacesResponse(makeResponse([], '10', 'Something went wrong'))
    ).toThrow('Something went wrong');
  });

  it('не кидає якщо errorCode === "0"', () => {
    expect(() => parseWorkspacesResponse(makeResponse([]))).not.toThrow();
  });
});

describe('parseWorkspacesResponse — порожні дані', () => {
  it('повертає [] якщо Workspace порожній масив', () => {
    expect(parseWorkspacesResponse(makeResponse([]))).toEqual([]);
  });

  it('повертає [] якщо Workspace відсутній у відповіді', () => {
    expect(parseWorkspacesResponse({ errorCode: '0', errorMessage: '' })).toEqual([]);
  });
});

describe('parseWorkspacesResponse — Workspace як одиночний об\'єкт', () => {
  it('Workspace — об\'єкт (не масив) → обробляється коректно', () => {
    const response = {
      errorCode: '0',
      errorMessage: '',
      Workspace: {
        Name: 'dev_orogov_ws2',
        Status: 'Delivered',
        CreatedByName: 'OROGOV',
        Version: [{ VerNum: '1', Comments: '', Object: { Operation: 'Update', ObjName: 'MySvc', ObjType: 'Business Service' } }],
      },
    };
    const result = parseWorkspacesResponse(response);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('dev_orogov_ws2');
    expect(result[0].businessServices).toHaveLength(1);
  });
});

describe('parseWorkspacesResponse — фільтрація ObjType', () => {
  it('включає лише Business Service', () => {
    const ws = makeWs('ws1', [
      makeVer([
        { ObjName: 'SvcA', ObjType: 'Business Service' },
        { ObjName: 'BC1',  ObjType: 'Business Component' },
        { ObjName: 'App1', ObjType: 'Applet' },
        { ObjName: 'PL1',  ObjType: 'Pick List' },
      ]),
    ]);
    const [result] = parseWorkspacesResponse(makeResponse([ws]));
    expect(result.businessServices).toHaveLength(1);
    expect(result.businessServices[0].ObjName).toBe('SvcA');
  });

  it('businessServices: [] якщо немає Business Service об\'єктів', () => {
    const ws = makeWs('ws1', [makeVer([{ ObjName: 'BC1', ObjType: 'Business Component' }])]);
    const [result] = parseWorkspacesResponse(makeResponse([ws]));
    expect(result.businessServices).toEqual([]);
  });

  it('businessServices: [] якщо Version відсутній', () => {
    const ws = { Name: 'ws1', Status: 'Delivered', CreatedByName: 'USER' };
    const [result] = parseWorkspacesResponse(makeResponse([ws]));
    expect(result.businessServices).toEqual([]);
  });
});

describe('parseWorkspacesResponse — дедуплікація по ObjName', () => {
  it('зберігає лише один запис якщо ObjName повторюється в різних версіях', () => {
    const ws = makeWs('ws1', [
      makeVer({ ObjName: 'SvcA', ObjType: 'Business Service' }),
      makeVer({ ObjName: 'SvcA', ObjType: 'Business Service' }),
      makeVer([
        { ObjName: 'SvcA', ObjType: 'Business Service' },
        { ObjName: 'SvcB', ObjType: 'Business Service' },
      ]),
    ]);
    const [result] = parseWorkspacesResponse(makeResponse([ws]));
    expect(result.businessServices).toHaveLength(2);
    const names = result.businessServices.map(bs => bs.ObjName);
    expect(names).toContain('SvcA');
    expect(names).toContain('SvcB');
  });
});

describe('parseWorkspacesResponse — структура результату', () => {
  it('повернений об\'єкт має всі обов\'язкові поля', () => {
    const ws = makeWs('dev_test_ws', [makeVer({ ObjName: 'SvcA', ObjType: 'Business Service' })]);
    const [result] = parseWorkspacesResponse(makeResponse([ws]));
    expect(result).toMatchObject({
      name:          'dev_test_ws',
      status:        'Delivered',
      createdByName: 'TESTUSER',
      processed:     false,
      reviewResult:  null,
      jiraIssueKey:  null,
      error:         null,
    });
    expect(typeof result.fetchedAt).toBe('string');
    expect(Array.isArray(result.businessServices)).toBe(true);
  });
});
