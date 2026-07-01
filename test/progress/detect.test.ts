import { describe, expect, it } from 'vitest';
import { isProgressCaption } from '../../src/progress/detect.js';

// The progress trigger keyword matches RU/UA/EN, any case, embedded in a sentence; a plain food
// caption and the empty string do not (they stay on the food-plate path).

describe('isProgressCaption', () => {
  it('matches the Russian keyword `прогресс` (any case, embedded)', () => {
    expect(isProgressCaption('прогресс')).toBe(true);
    expect(isProgressCaption('вот мой ПРОГРЕСС за месяц')).toBe(true);
  });

  it('matches the Ukrainian keyword `прогрес`', () => {
    expect(isProgressCaption('прогрес')).toBe(true);
    expect(isProgressCaption('Мій прогрес')).toBe(true);
  });

  it('matches the English keyword `progress`', () => {
    expect(isProgressCaption('progress')).toBe(true);
    expect(isProgressCaption('My Progress this week')).toBe(true);
  });

  it('does not match a plain food caption', () => {
    expect(isProgressCaption('куриное филе и борщ')).toBe(false);
    expect(isProgressCaption('grilled chicken')).toBe(false);
  });

  it('does not match the empty string', () => {
    expect(isProgressCaption('')).toBe(false);
  });
});
