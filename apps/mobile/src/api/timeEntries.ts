/**
 * Time-entries REST client — thin typed wrappers over `apiRequest` (bearer auth +
 * refresh handled there). Contract shapes come from `@honeydo/shared`; never redefine
 * them here.
 */
import type {
  CreateTimeEntry,
  ManualTimeEntry,
  TimeEntry,
  UpdateTimeEntry,
} from '@honeydo/shared';
import { apiRequest } from './client';

export const timeEntriesApi = {
  list: () => apiRequest<TimeEntry[]>('/time-entries'),

  running: () => apiRequest<TimeEntry | null>('/time-entries/running'),

  start: (body: CreateTimeEntry) =>
    apiRequest<TimeEntry>('/time-entries', { method: 'POST', body }),

  manual: (body: ManualTimeEntry) =>
    apiRequest<TimeEntry>('/time-entries/manual', { method: 'POST', body }),

  stop: (id: string) =>
    apiRequest<TimeEntry>(`/time-entries/${id}/stop`, { method: 'POST' }),

  continue: (id: string) =>
    apiRequest<TimeEntry>(`/time-entries/${id}/continue`, { method: 'POST' }),

  update: (id: string, body: UpdateTimeEntry) =>
    apiRequest<TimeEntry>(`/time-entries/${id}`, { method: 'PATCH', body }),

  remove: (id: string) =>
    apiRequest<void>(`/time-entries/${id}`, { method: 'DELETE' }),
};
