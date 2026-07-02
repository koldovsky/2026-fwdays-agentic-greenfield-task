import { Activity, Goal, Sex, type TargetInputs, type Targets } from './types.js';
import { round1 } from '../util/num.js';

// Pure target calculator (US-1): Mifflin–St Jeor BMR → TDEE → goal-adjusted kcal, with a deficit
// floor. No LLM, no I/O — numbers come from here, never the model.

const ACTIVITY_MULTIPLIER: Record<Activity, number> = {
  [Activity.SEDENTARY]: 1.2,
  [Activity.LIGHT]: 1.375,
  [Activity.MODERATE]: 1.55,
  [Activity.ACTIVE]: 1.725,
  [Activity.VERY_ACTIVE]: 1.9,
};

const GOAL_FACTOR: Record<Goal, number> = {
  [Goal.CUT]: 0.8,
  [Goal.MAINTAIN]: 1.0,
  [Goal.LEAN_BULK]: 1.1,
};

const PROTEIN_G_PER_KG = 2.0; // mid of the 1.8–2.2 band
const FAT_G_PER_KG_FLOOR = 0.8;
const FAT_KCAL_SHARE = 0.25;
const ABSOLUTE_KCAL_FLOOR = 1200;

const KCAL_PER_G_PROTEIN = 4;
const KCAL_PER_G_CARB = 4;
const KCAL_PER_G_FAT = 9;

const mifflinBmr = ({ age, sex, heightCm, weightKg }: TargetInputs): number =>
  10 * weightKg + 6.25 * heightCm - 5 * age + (sex === Sex.MALE ? 5 : -161);

export const computeTargets = (inputs: TargetInputs): Targets => {
  const bmr = mifflinBmr(inputs);
  const adjusted = bmr * ACTIVITY_MULTIPLIER[inputs.activity] * GOAL_FACTOR[inputs.goal];

  // No extreme deficit: a cut never drops below BMR or the absolute 1200 kcal floor.
  const floor = Math.max(bmr, ABSOLUTE_KCAL_FLOOR);
  const kcal = Math.round(inputs.goal === Goal.CUT ? Math.max(adjusted, floor) : adjusted);

  const proteinG = round1(PROTEIN_G_PER_KG * inputs.weightKg);
  const fatG = round1(
    Math.max(FAT_G_PER_KG_FLOOR * inputs.weightKg, (FAT_KCAL_SHARE * kcal) / KCAL_PER_G_FAT),
  );
  const remainingKcal = kcal - proteinG * KCAL_PER_G_PROTEIN - fatG * KCAL_PER_G_FAT;
  const carbsG = round1(Math.max(0, remainingKcal / KCAL_PER_G_CARB));

  return { kcal, proteinG, fatG, carbsG };
};
