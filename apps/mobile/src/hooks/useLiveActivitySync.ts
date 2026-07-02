/**
 * Binds the iOS Live Activity to the single running time entry (FR-LIVE-04/05).
 *
 * The JS layer owns the lifecycle (TC-NATIVE-03): when a running entry appears we `start`
 * the activity, on a description edit we `update`, and when it clears we `end`. A Stop tapped
 * from the activity never runs its own stop logic — it routes back through the existing
 * `useStopEntry` mutation so the server stays the single authority. On foreground we
 * reconcile: apply any stop that fired while backgrounded/terminated and re-sync the activity
 * to the current entry. No-ops entirely when Live Activities aren't supported.
 */
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { liveActivity, type StopRequest } from '../native/liveActivity';
import { useRunningEntry, useStopEntry } from './useTimeEntries';

function titleFor(note: string | null | undefined): string {
  const trimmed = note?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'Timer';
}

export function useLiveActivitySync(): void {
  const running = useRunningEntry();
  const stop = useStopEntry();

  const entryId = running?.id;
  const startedAt = running?.startedAt ?? null;
  const title = titleFor(running?.note);

  // Latest values for the mount-once listeners (avoid re-subscribing on every change).
  const stopRef = useRef(stop);
  stopRef.current = stop;
  const titleRef = useRef(title);
  titleRef.current = title;
  const runningRef = useRef<{ id: string; startedAt: string } | null>(null);
  runningRef.current = entryId && startedAt ? { id: entryId, startedAt } : null;

  // Start when a timer begins, end when it clears. Title changes are handled separately so a
  // description edit doesn't tear down and recreate the activity.
  useEffect(() => {
    if (!liveActivity.isSupported) return;
    if (entryId && startedAt) {
      liveActivity.start({ entryId, title: titleRef.current, startedAt });
    } else {
      liveActivity.end();
    }
  }, [entryId, startedAt]);

  // Push discrete updates on description edits while running.
  useEffect(() => {
    if (!liveActivity.isSupported) return;
    if (!entryId || !startedAt) return;
    liveActivity.update({ title, isRunning: true });
  }, [title, entryId, startedAt]);

  // Route a Live-Activity Stop (iOS 17+ in-place) through the real stop mutation.
  useEffect(() => {
    if (!liveActivity.isSupported) return;
    const applyStop = (req: StopRequest) => {
      const id = req.entryId || runningRef.current?.id;
      if (id) stopRef.current.mutate(id);
      liveActivity.clearPendingStop();
    };
    const sub = liveActivity.addStopListener(applyStop);
    return () => sub.remove();
  }, []);

  // On foreground: apply a stop that fired while away, then re-sync the activity to truth.
  useEffect(() => {
    if (!liveActivity.isSupported) return;
    const onChange = (state: AppStateStatus) => {
      if (state !== 'active') return;
      const pending = liveActivity.readPendingStop();
      if (pending) {
        const id = pending.entryId || runningRef.current?.id;
        if (id) stopRef.current.mutate(id);
        liveActivity.clearPendingStop();
      }
      const current = runningRef.current;
      if (current) {
        liveActivity.start({
          entryId: current.id,
          title: titleRef.current,
          startedAt: current.startedAt,
        });
      } else {
        liveActivity.end();
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);
}
