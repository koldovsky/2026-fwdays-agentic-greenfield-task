export type BackgroundCondition = "clear" | "overcast" | "rain" | "snow";

export function weatherCodeToBackgroundCondition(code: number): BackgroundCondition {
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "snow";
  }

  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 99)) {
    return "rain";
  }

  if (code === 3 || [45, 48].includes(code)) {
    return "overcast";
  }

  return "clear";
}
