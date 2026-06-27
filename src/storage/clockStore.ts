/**
 * A once-a-second clock exposed to React via `useSyncExternalStore`. The cached
 * `Date` is stable between ticks so snapshots are referentially consistent; the
 * interval only runs while at least one component subscribes. SSR returns
 * `null` so the countdown renders a placeholder until the client mounts.
 */

let current: Date | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function tick(): void {
  current = new Date();
  for (const listener of listeners) listener();
}

// Background tabs throttle the interval; re-tick the moment the user returns so a
// due break is detected promptly (FR-NOTIFY-01 / notify design).
function handleVisibility(): void {
  if (document.visibilityState === "visible") tick();
}

export function subscribeClock(listener: () => void): () => void {
  if (listeners.size === 0) {
    current = new Date();
    intervalId = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", handleVisibility);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
      document.removeEventListener("visibilitychange", handleVisibility);
    }
  };
}

export function getClockSnapshot(): Date | null {
  return current;
}

export function getServerClockSnapshot(): Date | null {
  return null;
}
