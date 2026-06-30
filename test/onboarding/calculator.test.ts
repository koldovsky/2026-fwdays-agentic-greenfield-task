import { describe, expect, it } from 'vitest';
import { computeTargets } from '../../src/onboarding/calculator.js';
import { Activity, Goal, Sex, type TargetInputs } from '../../src/onboarding/types.js';

const base: TargetInputs = {
  age: 30,
  sex: Sex.MALE,
  heightCm: 180,
  weightKg: 80,
  activity: Activity.MODERATE,
  goal: Goal.MAINTAIN,
};

describe('computeTargets', () => {
  it('uses the sex-specific Mifflin–St Jeor constant (male > female, same inputs)', () => {
    expect(computeTargets({ ...base, sex: Sex.MALE }).kcal).toBeGreaterThan(
      computeTargets({ ...base, sex: Sex.FEMALE }).kcal,
    );
  });

  it('keeps protein in 1.8–2.2 g/kg and fat at or above the 0.8 g/kg floor', () => {
    const t = computeTargets(base);
    const proteinPerKg = t.proteinG / base.weightKg;
    expect(proteinPerKg).toBeGreaterThanOrEqual(1.8);
    expect(proteinPerKg).toBeLessThanOrEqual(2.2);
    expect(t.fatG).toBeGreaterThanOrEqual(0.8 * base.weightKg);
  });

  it('keeps macro grams consistent with the kcal target (4/4/9)', () => {
    const t = computeTargets(base);
    const macroKcal = t.proteinG * 4 + t.carbsG * 4 + t.fatG * 9;
    expect(Math.abs(macroKcal - t.kcal)).toBeLessThanOrEqual(5);
  });

  it('clamps an aggressive cut up to the safe floor (no extreme deficit)', () => {
    // Small person: a 20% cut would land ~1009 kcal, below the 1200 absolute floor.
    const t = computeTargets({
      age: 25,
      sex: Sex.FEMALE,
      heightCm: 150,
      weightKg: 40,
      activity: Activity.SEDENTARY,
      goal: Goal.CUT,
    });
    expect(t.kcal).toBe(1200);
  });

  it('never returns a cut below BMR for a larger person', () => {
    const inputs: TargetInputs = {
      age: 30,
      sex: Sex.MALE,
      heightCm: 185,
      weightKg: 95,
      activity: Activity.SEDENTARY,
      goal: Goal.CUT,
    };
    const bmr = 10 * 95 + 6.25 * 185 - 5 * 30 + 5; // 1956.25
    expect(computeTargets(inputs).kcal).toBeGreaterThanOrEqual(Math.round(bmr));
  });
});
