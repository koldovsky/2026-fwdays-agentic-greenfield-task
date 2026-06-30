import { describe, expect, it } from 'vitest';
import { catalogWhere, tenantWhere } from './tenancy.js';

describe('tenantWhere', () => {
  it('injects userId into an empty where', () => {
    expect(tenantWhere(7)).toEqual({ userId: 7 });
  });

  it('merges userId into an existing where', () => {
    expect(tenantWhere(7, { date: '2026-06-30' })).toEqual({ userId: 7, date: '2026-06-30' });
  });

  it('forces the calling tenant — a passed-in userId cannot widen scope', () => {
    // Even if a caller tries to smuggle another userId in the base where, the tenant wins.
    const where = tenantWhere(7, { userId: 999 });
    expect(where.userId).toBe(7);
  });
});

describe('catalogWhere', () => {
  it('matches the tenant rows plus the global catalog (userId null)', () => {
    expect(catalogWhere(7)).toEqual({ AND: [{ OR: [{ userId: 7 }, { userId: null }] }] });
  });

  it('preserves a caller filter under AND while widening to globals', () => {
    expect(catalogWhere(7, { name: 'tvorog' })).toEqual({
      AND: [{ name: 'tvorog' }, { OR: [{ userId: 7 }, { userId: null }] }],
    });
  });

  it("does not clobber a caller's own OR", () => {
    const where = catalogWhere(7, { OR: [{ name: 'a' }, { name: 'b' }] });
    expect(where.AND).toHaveLength(2);
    expect(where.AND[0]).toEqual({ OR: [{ name: 'a' }, { name: 'b' }] });
  });
});
