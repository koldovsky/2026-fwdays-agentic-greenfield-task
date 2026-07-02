/**
 * Daily-insight REST client. Sends the device's IANA time zone so the server buckets "today"
 * and the 14-day window in the user's local days (the server owns the LLM call — TC-STACK-07).
 */
import type { DailyInsight } from '@honeydo/shared';
import { apiRequest } from './client';

function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export const insightApi = {
  get: () =>
    apiRequest<DailyInsight>(`/insight?tz=${encodeURIComponent(deviceTimeZone())}`),

  refresh: () =>
    apiRequest<DailyInsight>(`/insight/refresh?tz=${encodeURIComponent(deviceTimeZone())}`, {
      method: 'POST',
    }),
};
