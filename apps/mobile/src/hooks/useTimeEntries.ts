/**
 * TanStack Query hooks for time entries (TC-STACK-05). Start/stop/continue apply
 * **optimistically** so the UI reflects in < 100 ms (NFR-PERF-01), snapshotting the
 * cache and rolling back on error; every mutation invalidates on settle to reconcile
 * with the server (which owns the single-running invariant).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateTimeEntry,
  ManualTimeEntry,
  TimeEntry,
  UpdateTimeEntry,
} from '@honeydo/shared';
import { timeEntriesApi } from '../api/timeEntries';

const KEY = ['time-entries'] as const;

/** Whole, non-negative elapsed seconds between two ISO timestamps. */
export function elapsedSeconds(startIso: string, endIso: string): number {
  return Math.max(
    0,
    Math.floor((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000),
  );
}

/** Stop whatever entry is running in a cached list, as of `now`. */
function withRunningStopped(entries: TimeEntry[], now: string): TimeEntry[] {
  return entries.map((e) =>
    e.stoppedAt === null
      ? { ...e, stoppedAt: now, durationSec: elapsedSeconds(e.startedAt, now) }
      : e,
  );
}

/** All entries, newest start first (server order). */
export function useEntries() {
  return useQuery({ queryKey: KEY, queryFn: timeEntriesApi.list });
}

/** The single running entry, derived from the entries cache (one source of truth). */
export function useRunningEntry(): TimeEntry | undefined {
  const { data } = useEntries();
  return data?.find((e) => e.stoppedAt === null);
}

/** A temporary running entry for the optimistic cache; replaced on invalidate. */
function optimisticRunning(note: string, now: string): TimeEntry {
  return {
    id: `temp-${now}`,
    userId: '',
    note,
    startedAt: now,
    stoppedAt: null,
    durationSec: null,
    tags: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Start a new timer; optimistically stops any running entry first (FR-ENTRY-01/03). */
export function useStartEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTimeEntry) => timeEntriesApi.start(body),
    onMutate: async (body: CreateTimeEntry) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<TimeEntry[]>(KEY) ?? [];
      const now = new Date().toISOString();
      qc.setQueryData<TimeEntry[]>(KEY, [
        optimisticRunning(body.note, now),
        ...withRunningStopped(prev, now),
      ]);
      return { prev };
    },
    onError: (_err, _body, ctx) => {
      if (ctx) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Stop a running entry (FR-ENTRY-02). */
export function useStopEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timeEntriesApi.stop(id),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<TimeEntry[]>(KEY) ?? [];
      const now = new Date().toISOString();
      qc.setQueryData<TimeEntry[]>(
        KEY,
        prev.map((e) =>
          e.id === id
            ? { ...e, stoppedAt: now, durationSec: elapsedSeconds(e.startedAt, now) }
            : e,
        ),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Continue a past entry: start a fresh running entry copying its note (FR-ENTRY-08). */
export function useContinueEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timeEntriesApi.continue(id),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<TimeEntry[]>(KEY) ?? [];
      const now = new Date().toISOString();
      const source = prev.find((e) => e.id === id);
      qc.setQueryData<TimeEntry[]>(KEY, [
        optimisticRunning(source?.note ?? '', now),
        ...withRunningStopped(prev, now),
      ]);
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Add a completed manual entry (FR-ENTRY-04). */
export function useManualEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ManualTimeEntry) => timeEntriesApi.manual(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Edit an entry (FR-ENTRY-05). */
export function useUpdateEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTimeEntry }) =>
      timeEntriesApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Delete an entry (FR-ENTRY-06); optimistically removed. */
export function useDeleteEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => timeEntriesApi.remove(id),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<TimeEntry[]>(KEY) ?? [];
      qc.setQueryData<TimeEntry[]>(
        KEY,
        prev.filter((e) => e.id !== id),
      );
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx) qc.setQueryData(KEY, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
