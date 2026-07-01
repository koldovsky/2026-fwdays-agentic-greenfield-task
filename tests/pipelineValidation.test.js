'use strict';

const path = require('path');
const { parseWorkspacesResponse } = require('../src/siebel/workspaces');

const realJson = require(path.join(__dirname, '../docs/get-workspace-objects.json'));

describe('pipelineValidation — parseWorkspacesResponse на реальних даних', () => {
  let result;

  beforeAll(() => {
    result = parseWorkspacesResponse(realJson);
  });

  it('не кидає на реальній відповіді Siebel', () => {
    expect(() => parseWorkspacesResponse(realJson)).not.toThrow();
  });

  it('повертає масив з 13 воркспейсів', () => {
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(13);
  });

  it('кожен результат має обов\'язкові поля', () => {
    for (const ws of result) {
      expect(ws).toMatchObject({
        processed:    false,
        reviewResult: null,
        jiraIssueKey: null,
        error:        null,
      });
      expect(typeof ws.name).toBe('string');
      expect(typeof ws.status).toBe('string');
      expect(typeof ws.createdByName).toBe('string');
      expect(typeof ws.fetchedAt).toBe('string');
      expect(Array.isArray(ws.businessServices)).toBe(true);
    }
  });

  it('MAIN має 4 унікальних Business Service', () => {
    const main = result.find(ws => ws.name === 'MAIN');
    expect(main).toBeDefined();
    const bsNames = main.businessServices.map(bs => bs.ObjName);
    expect(bsNames).toContain('Areon Code Review Service');
    expect(bsNames).toContain('SP Premise Rental');
    expect(bsNames).toContain('SP Legal Department Service');
    expect(bsNames).toContain('SPAreonKyivstarBS');
    expect(main.businessServices).toHaveLength(4);
  });

  it('dev_mmorozov_20260624_fixkyivstar має 1 Business Service', () => {
    const ws = result.find(ws => ws.name === 'dev_mmorozov_20260624_fixkyivstar');
    expect(ws).toBeDefined();
    expect(ws.businessServices).toHaveLength(1);
    expect(ws.businessServices[0].ObjName).toBe('SPAreonKyivstarBS');
  });

  it('воркспейси без Business Service мають businessServices: []', () => {
    const noBS = ['dev_dshevchuk_sun-874', 'dev_dshevchuk_sun-fo', 'dev_mhorobets_sun886',
                  'dev_mhorobets_sun891', 'dev_orogov_fix20260618', 'dev_orogov_test_io',
                  'dev_orogov_test_io_2'];
    for (const name of noBS) {
      const ws = result.find(w => w.name === name);
      expect(ws).toBeDefined();
      expect(ws.businessServices).toEqual([]);
    }
  });

  it('воркспейси з Business Service мають businessServices.length > 0', () => {
    const withBS = ['MAIN', 'dev_dshevchuk_sun-882', 'dev_mhorobets_sun886_fixemail',
                    'dev_mmorozov_20260624_fixkyivstar', 'dev_orogov_ws', 'dev_spishchuk_sun_892'];
    for (const name of withBS) {
      const ws = result.find(w => w.name === name);
      expect(ws).toBeDefined();
      expect(ws.businessServices.length).toBeGreaterThan(0);
    }
  });

  it('дедуплікація: SP Premise Rental зустрічається в MAIN двічі але в результаті один раз', () => {
    const main = result.find(ws => ws.name === 'MAIN');
    const premiseRentalCount = main.businessServices.filter(bs => bs.ObjName === 'SP Premise Rental').length;
    expect(premiseRentalCount).toBe(1);
  });

  it('Version без Object (VerNum 4) не призводить до помилки', () => {
    const main = result.find(ws => ws.name === 'MAIN');
    expect(main).toBeDefined();
  });
});
