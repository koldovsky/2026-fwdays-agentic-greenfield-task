import { describe, expect, it } from 'vitest';
import { Meal } from '@prisma/client';
import { inferMeal } from '../../src/food/meal.js';

// Meal is a deterministic function of the user's local clock (no LLM). Boundaries are inclusive-low,
// exclusive-high: 05–11 breakfast, 11–16 lunch, 16–22 dinner, else snack.

describe('inferMeal', () => {
  const at = (utcHour: number): Date =>
    new Date(`2026-06-30T${String(utcHour).padStart(2, '0')}:00:00Z`);

  it('maps the local hour to a meal in the user timezone (UTC)', () => {
    expect(inferMeal(at(8), 'UTC')).toBe(Meal.breakfast);
    expect(inferMeal(at(13), 'UTC')).toBe(Meal.lunch);
    expect(inferMeal(at(19), 'UTC')).toBe(Meal.dinner);
    expect(inferMeal(at(2), 'UTC')).toBe(Meal.snack);
    expect(inferMeal(at(23), 'UTC')).toBe(Meal.snack);
  });

  it('honors the boundary hours exactly', () => {
    expect(inferMeal(at(5), 'UTC')).toBe(Meal.breakfast);
    expect(inferMeal(at(11), 'UTC')).toBe(Meal.lunch);
    expect(inferMeal(at(16), 'UTC')).toBe(Meal.dinner);
    expect(inferMeal(at(22), 'UTC')).toBe(Meal.snack);
  });

  it('shifts with the user timezone, not the server clock', () => {
    // 09:00 UTC is 12:00 in Kyiv (UTC+3 in summer) → lunch, not breakfast.
    expect(inferMeal(at(9), 'Europe/Kyiv')).toBe(Meal.lunch);
  });
});
