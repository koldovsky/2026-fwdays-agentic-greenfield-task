export type DailyComfortInput = {
  feelsLikeC: number;
  precipProbability: number;
  windSpeedKmh: number;
  cloudCoverPercent: number;
  uvIndex: number;
};

export type ComfortResult = {
  value: number;
  rationale: string;
};

export type ComfortBadgeTier = "green" | "yellow" | "red";

export type ForecastDayInput = {
  date: string;
  input: DailyComfortInput;
};

export type WeekendHighlight = {
  value: number;
  saturday: ComfortResult;
  sunday: ComfortResult;
};

const RATIONALE_MAX_LENGTH = 80;

const PLEASANT_WORDS = /приємн/i;

export class ComfortValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ComfortValidationError";
  }
}

export function comfortScore(daily: DailyComfortInput): ComfortResult {
  validateDailyInput(daily);
  const value = computeComfortValue(daily);
  const rationale = buildRationale(daily, value);
  return { value, rationale };
}

export function comfortBadgeTier(value: number): ComfortBadgeTier {
  if (!Number.isFinite(value)) {
    throw new ComfortValidationError("Badge tier value must be a finite number");
  }
  if (value >= 70) return "green";
  if (value >= 40) return "yellow";
  return "red";
}

export function weekendComfortHighlight(
  days: ForecastDayInput[],
): WeekendHighlight | null {
  if (days.length === 0) return null;

  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const saturday = sorted.find((day) => weekdayUtc(day.date) === 6);
  if (!saturday) return null;

  const sunday = sorted.find(
    (day) => weekdayUtc(day.date) === 0 && day.date > saturday.date,
  );
  if (!sunday) return null;

  const saturdayResult = comfortScore(saturday.input);
  const sundayResult = comfortScore(sunday.input);

  return {
    value: Math.round((saturdayResult.value + sundayResult.value) / 2),
    saturday: saturdayResult,
    sunday: sundayResult,
  };
}

function validateDailyInput(daily: DailyComfortInput): void {
  const fields: Array<[keyof DailyComfortInput, number, number]> = [
    ["feelsLikeC", -60, 55],
    ["precipProbability", 0, 100],
    ["windSpeedKmh", 0, 200],
    ["cloudCoverPercent", 0, 100],
    ["uvIndex", 0, 20],
  ];

  for (const [key, min, max] of fields) {
    const value = daily[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new ComfortValidationError(`Invalid comfort input: ${key}`);
    }
    if (value < min || value > max) {
      throw new ComfortValidationError(`${key} out of range (${min}..${max})`);
    }
  }
}

function computeComfortValue(input: DailyComfortInput): number {
  let score = 100;
  score -= Math.abs(input.feelsLikeC - 22) * 2.5;
  score -= input.precipProbability * 0.7;
  score -= Math.max(0, input.windSpeedKmh - 12) * 0.8;
  score -= input.cloudCoverPercent * 0.15;
  score -= Math.max(0, input.uvIndex - 3) * 1.5;

  if (input.precipProbability >= 60 && input.feelsLikeC < 15) {
    score = Math.min(score, 35);
  }

  return Math.round(clamp(score, 0, 100));
}

function buildRationale(input: DailyComfortInput, value: number): string {
  const rainy = input.precipProbability >= 40;
  const cold = input.feelsLikeC < 12;
  const windy = input.windSpeedKmh > 35;
  const highUv = input.uvIndex >= 8;

  let rationale: string;

  if (rainy && cold) {
    rationale = "Дощ і прохолодно — для прогулянки не найкраще.";
  } else if (rainy) {
    rationale = "Ймовірний дощ — варто мати парасольку.";
  } else if (cold) {
    rationale = "Прохолодно — одягайтесь тепліше.";
  } else if (windy) {
    rationale = "Помірний вітер — може відчуватись прохолодніше.";
  } else if (highUv) {
    rationale = "Сильне сонце — захист від UV буде доречним.";
  } else if (value >= 70) {
    rationale = "Комфортна погода для дня на свіжому повітрі.";
  } else if (value >= 40) {
    rationale = "Погода змішана — плануйте з запасом.";
  } else {
    rationale = "Складні умови — краще обрати інший день.";
  }

  if (
    (input.precipProbability >= 50 || value < 50) &&
    PLEASANT_WORDS.test(rationale)
  ) {
    rationale = "Дощ або холод — для прогулянки не найкраще.";
  }

  if (rationale.length > RATIONALE_MAX_LENGTH) {
    rationale = `${rationale.slice(0, RATIONALE_MAX_LENGTH - 1)}…`;
  }

  return rationale;
}

function weekdayUtc(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

