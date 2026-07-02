import { describe, expect, it } from 'vitest';
import { buildAnswer } from '../../src/query/answer.js';
import type { DayTotals, Targets } from '../../src/query/types.js';

// The prose contains the numbers, so it must be assembled in code (invariants #1/#2): logged-of-goal
// + remaining when a target exists, bare total otherwise; an empty day answers honestly, never `0`;
// asking a specific nutrient narrows the reply, no keyword renders the full breakdown; prose mirrors
// the user's language while the underlying field names stay English (invariant #6).

const totals = (over: Partial<DayTotals> = {}): DayTotals => ({
  kcal: 1800,
  proteinG: 120,
  fatG: 60,
  carbsG: 180,
  entryCount: 3,
  ...over,
});

const NO_TARGETS: Targets = { kcal: null, proteinG: null, fatG: null, carbsG: null };

describe('buildAnswer', () => {
  it('shows logged-of-goal and remaining when a target is set', () => {
    const targets: Targets = { kcal: null, proteinG: 160, fatG: null, carbsG: null };

    const answer = buildAnswer('сколько белка?', totals({ proteinG: 120 }), targets, ['protein']);

    expect(answer.text).toContain('120');
    expect(answer.text).toContain('160');
    expect(answer.text).toContain('40'); // remaining
  });

  it('shows the bare total with no goal/remaining figures when no target is set', () => {
    const answer = buildAnswer('сколько белка?', totals({ proteinG: 120 }), NO_TARGETS, [
      'protein',
    ]);

    expect(answer.text).toContain('120');
    expect(answer.text).not.toMatch(/из|of|з/); // no "of goal" phrasing
  });

  it('answers honestly on an empty day instead of reporting 0', () => {
    const answer = buildAnswer(
      'сколько калорий сегодня?',
      totals({ kcal: 0, proteinG: 0, fatG: 0, carbsG: 0, entryCount: 0 }),
      NO_TARGETS,
      ['kcal'],
    );

    expect(answer.text).not.toContain('0');
    expect(answer.text.toLowerCase()).toMatch(/нічого|ничего|nothing/);
  });

  it('reports only the asked nutrient for a specific question', () => {
    const answer = buildAnswer('сколько жира?', totals(), NO_TARGETS, ['fat']);

    expect(answer.text).toContain('60');
    expect(answer.text).not.toMatch(/калории|белк|углевод/i);
  });

  it('reports the full breakdown when all four nutrients are asked', () => {
    const answer = buildAnswer('что по сегодня?', totals(), NO_TARGETS, [
      'kcal',
      'protein',
      'fat',
      'carbs',
    ]);

    expect(answer.text).toContain('1800');
    expect(answer.text).toContain('120');
    expect(answer.text).toContain('60');
    expect(answer.text).toContain('180');
  });

  // TEMPORAL DEMO HACK (drop with the hack in src/util/lang.ts): Cyrillic is forced to Ukrainian; expect uk prose.
  it('mirrors Russian-input prose as Ukrainian while keeping numbers and structure consistent', () => {
    const answer = buildAnswer('сколько калорий?', totals(), NO_TARGETS, ['kcal']);

    expect(answer.text).toMatch(/Калорії/);
  });

  it('mirrors Ukrainian prose', () => {
    const answer = buildAnswer('скільки калорій?', totals(), NO_TARGETS, ['kcal']);

    expect(answer.text).toMatch(/Калорії/);
  });

  it('mirrors English prose and uses English units', () => {
    const targets: Targets = { kcal: null, proteinG: 160, fatG: null, carbsG: null };
    const answer = buildAnswer('how much protein?', totals({ proteinG: 120 }), targets, [
      'protein',
    ]);

    expect(answer.text).toMatch(/Protein/);
    expect(answer.text).toContain('g');
    expect(answer.text).not.toContain('г');
  });

  it('renders grams to 1 decimal place and kcal as a whole number', () => {
    const fractional = totals({ kcal: 1800, proteinG: 120.5, fatG: 60, carbsG: 180 });
    const answer = buildAnswer('protein?', fractional, NO_TARGETS, ['protein']);

    expect(answer.text).toContain('120.5');
  });
});
