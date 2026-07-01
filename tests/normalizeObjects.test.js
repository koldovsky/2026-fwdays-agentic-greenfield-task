'use strict';

const { normalizeObjects } = require('../src/siebel/workspaces');

describe('normalizeObjects — Варіант 1: поле відсутнє', () => {
  it('повертає [] якщо Object є undefined', () => {
    expect(normalizeObjects(undefined)).toEqual([]);
  });

  it('повертає [] якщо Object є null', () => {
    expect(normalizeObjects(null)).toEqual([]);
  });

  it('повертає [] для порожнього рядка (falsy)', () => {
    expect(normalizeObjects('')).toEqual([]);
  });

  it('повертає [] для 0 (falsy)', () => {
    expect(normalizeObjects(0)).toEqual([]);
  });
});

describe('normalizeObjects — Варіант 2: одиночний об\'єкт', () => {
  it('загортає одиночний об\'єкт у масив', () => {
    const obj = { Operation: 'Update', ObjName: 'SPAreonKyivstarBS', ObjType: 'Business Service' };
    const result = normalizeObjects(obj);
    expect(result).toEqual([obj]);
  });

  it('результат є масивом з одним елементом', () => {
    const obj = { Operation: 'Insert', ObjName: 'SP Legal Department Service', ObjType: 'Business Service' };
    const result = normalizeObjects(obj);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });

  it('зберігає всі поля об\'єкту при загортанні', () => {
    const obj = { Operation: 'Update', ObjName: 'SomeService', ObjType: 'Business Service' };
    const result = normalizeObjects(obj);
    expect(result[0]).toMatchObject(obj);
  });
});

describe('normalizeObjects — Варіант 3: масив', () => {
  it('повертає масив без змін', () => {
    const arr = [
      { Operation: 'Update', ObjName: 'SP Location',       ObjType: 'Business Component' },
      { Operation: 'Update', ObjName: 'SP Premise Rental', ObjType: 'Business Service'   },
    ];
    expect(normalizeObjects(arr)).toEqual(arr);
  });

  it('повертає масив з одним елементом без змін', () => {
    const arr = [{ Operation: 'Update', ObjName: 'SingleInArray', ObjType: 'Business Service' }];
    expect(normalizeObjects(arr)).toEqual(arr);
    expect(normalizeObjects(arr)).toHaveLength(1);
  });

  it('повертає порожній масив без змін', () => {
    expect(normalizeObjects([])).toEqual([]);
  });
});
