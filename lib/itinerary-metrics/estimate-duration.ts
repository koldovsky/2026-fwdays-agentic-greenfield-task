import { ASSUMED_AVERAGE_SPEED_KMH } from "./constants";

export function estimateDurationMinutes(
  distanceKm: number,
  averageSpeedKmh = ASSUMED_AVERAGE_SPEED_KMH,
): number {
  if (distanceKm <= 0 || averageSpeedKmh <= 0) {
    return 0;
  }

  return Math.round((distanceKm / averageSpeedKmh) * 60);
}
