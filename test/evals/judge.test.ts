import { describe, expect, it, vi } from 'vitest';
import {
  capForCritical,
  combine,
  FAIL_CEILING,
  gradeWithJudge,
  isBorderline,
  type JudgeVerdict,
} from '../../evals/judge.js';

const verdict = (score: number, criticalMiss = false): JudgeVerdict => ({
  score,
  criticalMiss,
  reasoning: 'test',
});

describe('capForCritical', () => {
  it('caps a CRITICAL miss at the fail ceiling (≤ 49)', () => {
    expect(capForCritical(verdict(95, true))).toBe(FAIL_CEILING);
  });

  it('leaves a passing verdict untouched', () => {
    expect(capForCritical(verdict(88, false))).toBe(88);
  });

  it('does not raise an already-low critical score', () => {
    expect(capForCritical(verdict(20, true))).toBe(20);
  });
});

describe('isBorderline / combine', () => {
  it('flags scores within the band of the threshold', () => {
    expect(isBorderline(72, 70, 5)).toBe(true);
    expect(isBorderline(80, 70, 5)).toBe(false);
  });

  it('combines double-judge scores conservatively (min)', () => {
    expect(combine([74, 68])).toBe(68);
  });
});

describe('gradeWithJudge', () => {
  it('returns the single score when not borderline (no second judge)', async () => {
    const judge = vi.fn().mockResolvedValue(verdict(90));
    const score = await gradeWithJudge(judge, 'rubric', 'produced', 70, 5);
    expect(score).toBe(90);
    expect(judge).toHaveBeenCalledTimes(1);
  });

  it('re-judges a borderline score and combines via min', async () => {
    const judge = vi.fn().mockResolvedValueOnce(verdict(72)).mockResolvedValueOnce(verdict(66));
    const score = await gradeWithJudge(judge, 'rubric', 'produced', 70, 5);
    expect(score).toBe(66);
    expect(judge).toHaveBeenCalledTimes(2);
  });

  it('caps a CRITICAL miss before the borderline check (fails the case)', async () => {
    const judge = vi.fn().mockResolvedValue(verdict(95, true));
    const score = await gradeWithJudge(judge, 'rubric', 'produced', 70, 5);
    expect(score).toBeLessThanOrEqual(FAIL_CEILING);
  });
});
