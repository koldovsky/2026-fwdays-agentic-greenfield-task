import { describe, expect, it } from 'vitest';
import { renderReview } from '../../src/reviews/render.js';
import type { DailyStats, MonthlyStats, WeeklyStats } from '../../src/reviews/types.js';

// Deterministic template fill (docs/review-templates.md). Edge cases degrade honestly: empty period →
// nudge not zeros; partial → coverage line; missing delta → "—"; missing metric → line omitted;
// prose spliced into named slots; language mirrored (manual UK) vs the Russian cron default.

const targets = { kcal: 1600, proteinG: 120, fatG: 50, carbsG: 150 };

const daily = (over: Partial<DailyStats> = {}): DailyStats => ({
  period: 'daily',
  date: '2026-06-24',
  totals: { kcal: 1234, proteinG: 100, fatG: 60, carbsG: 120, entryCount: 3 },
  targets,
  meals: ['breakfast', 'lunch'] as DailyStats['meals'],
  entryCount: 3,
  estimateCount: 1,
  empty: false,
  ...over,
});

const weekly = (over: Partial<WeeklyStats> = {}): WeeklyStats => ({
  period: 'weekly',
  start: '2026-06-22',
  end: '2026-06-28',
  targets,
  avg: { kcal: 1600, proteinG: 118, fatG: 48, carbsG: 150 },
  loggedDays: 7,
  periodDays: 7,
  daysHitProtein: 5,
  daysFatOk: 6,
  weekStartWeight: 90,
  weekEndWeight: 89,
  weightDelta: -1,
  ...over,
});

const monthly = (over: Partial<MonthlyStats> = {}): MonthlyStats => ({
  period: 'monthly',
  start: '2026-06-01',
  end: '2026-06-30',
  year: 2026,
  monthIndex: 5,
  targets,
  avg: { kcal: 1620, proteinG: 115, fatG: 49, carbsG: 155 },
  loggedDays: 30,
  periodDays: 30,
  weeks: [
    { kcal: 1600, proteinG: 120, fatG: 45, carbsG: 150 },
    { kcal: 1650, proteinG: 110, fatG: 52, carbsG: 160 },
  ],
  weeksHitProtein: 1,
  weekCount: 2,
  weightStart: 91,
  weightEnd: 89,
  weightDelta: -2,
  waistStart: 88,
  waistEnd: 86,
  waistDelta: -2,
  ...over,
});

describe('renderReview — daily', () => {
  it('renders the numeric block, meal/estimate meta, and spliced prose', () => {
    const text = renderReview(
      daily(),
      { drivers: 'масло на сковороде', verdict: 'в дефиците' },
      'ru',
    );

    expect(text).toContain('Ревью дня — 24.06.2026');
    expect(text).toContain('Калории: 1234 / 1600');
    expect(text).toContain('Приёмы: завтрак, обед (3 записей, 1 оценок)');
    expect(text).toContain('Драйверы: масло на сковороде');
    expect(text).toContain('Вердикт: в дефиците');
  });

  it('empty day → a nudge, not a table of zeros', () => {
    const text = renderReview(daily({ empty: true }), {}, 'ru');

    expect(text).not.toContain('Калории:');
    expect(text).toContain('ничего не записано');
  });

  it('renders a dash for an unset target and no diff', () => {
    const text = renderReview(
      daily({ targets: { kcal: null, proteinG: null, fatG: null, carbsG: null } }),
      { drivers: '—', verdict: 'ok' },
      'ru',
    );

    expect(text).toContain('Калории: 1234 / —');
    expect(text).not.toContain('/ 1600');
  });

  it('mirrors English prose and labels', () => {
    const text = renderReview(daily(), { drivers: 'oil', verdict: 'on track' }, 'en');

    expect(text).toContain('Daily review');
    expect(text).toContain('Calories: 1234 / 1600');
    expect(text).toContain('Verdict: on track');
  });
});

describe('renderReview — weekly', () => {
  it('renders averages, days-hit counts, the weight delta and the rollup prose', () => {
    const text = renderReview(
      weekly(),
      { whatWorked: 'стабильно', draggedBack: 'вечерние срывы', focus: 'больше белка' },
      'ru',
    );

    expect(text).toContain('Ревью недели — 22.06 – 28.06.2026');
    expect(text).toContain('Белок в цель: 5 / 7 дней');
    expect(text).toContain('Вес: 90 → 89 кг  (-1 vs прошлой недели)');
    expect(text).toContain('Что работало: стабильно');
    expect(text).toContain('Фокус на следующую неделю: больше белка');
  });

  it('states coverage when the period is partial (averages over logged days only)', () => {
    const text = renderReview(weekly({ loggedDays: 5 }), {}, 'ru');

    expect(text).toContain('5/7 дней залогировано');
  });

  it('renders a dash for a missing weight-delta baseline', () => {
    const text = renderReview(weekly({ weightDelta: null }), {}, 'ru');

    expect(text).toContain('Вес: 90 → 89 кг  (— vs прошлой недели)');
  });

  it('omits the weight line entirely when no weight was logged in the period', () => {
    const text = renderReview(
      weekly({ weekStartWeight: null, weekEndWeight: null, weightDelta: null }),
      {},
      'ru',
    );

    expect(text).not.toContain('Вес:');
  });

  it('empty week → a nudge, not a table', () => {
    const text = renderReview(weekly({ loggedDays: 0 }), {}, 'ru');

    expect(text).not.toContain('Среднее в день');
    expect(text).toContain('ничего не записано');
  });

  it('renders a dash when the protein target is unset', () => {
    const text = renderReview(
      weekly({ daysHitProtein: null, targets: { ...targets, proteinG: null } }),
      {},
      'ru',
    );

    expect(text).toContain('Белок в цель: — / 7 дней');
  });
});

describe('renderReview — monthly', () => {
  it('renders the per-week trend, month average, composition and prose', () => {
    const text = renderReview(
      monthly(),
      { whatWorked: 'дисциплина', draggedBack: 'выходные', focus: 'план еды' },
      'ru',
    );

    expect(text).toContain('Ревью месяца — июнь 2026');
    expect(text).toContain('Неделя 1: 1600 ккал · Б 120 · Ж 45 · У 150');
    expect(text).toContain('Неделя 2: 1650 ккал');
    expect(text).toContain('Вес: 91 → 89 кг  (-2)');
    expect(text).toContain('Талия: 88 → 86 см  (-2)');
    expect(text).toContain('Белок в цель: 1 / 2 недель в среднем');
    expect(text).toContain('План на следующий месяц: план еды');
  });

  it('omits the waist line when waist was never measured ("нет данных" not carried forward)', () => {
    const text = renderReview(
      monthly({ waistStart: null, waistEnd: null, waistDelta: null }),
      {},
      'ru',
    );

    expect(text).not.toContain('Талия:');
    expect(text).toContain('Вес:');
  });
});
