import { describe, expect, it } from 'vitest';
import { accuracy, gradeExact } from '../../evals/grade.js';

describe('gradeExact', () => {
  it('matches identical labels and rejects mismatches', () => {
    expect(gradeExact('log', 'log')).toBe(true);
    expect(gradeExact('log', 'query')).toBe(false);
  });
});

describe('accuracy', () => {
  it('is the fraction of passing results', () => {
    expect(accuracy([true, true, false, true])).toBe(0.75);
  });

  it('scores an empty set as 1 (nothing to fail)', () => {
    expect(accuracy([])).toBe(1);
  });
});
