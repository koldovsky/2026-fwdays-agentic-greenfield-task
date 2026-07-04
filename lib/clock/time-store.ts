import { formatLocalTime, type LocalTimeDisplay } from "./format-local-time";

const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

// Stable references required by useSyncExternalStore — never return fresh objects per call.
const serverSnapshot: LocalTimeDisplay = formatLocalTime(new Date());
let clientSnapshot: LocalTimeDisplay = serverSnapshot;

function refreshClientSnapshot() {
  clientSnapshot = formatLocalTime(new Date());
}

function notifyListeners() {
  refreshClientSnapshot();
  for (const listener of listeners) {
    listener();
  }
}

function startInterval() {
  if (intervalId === null) {
    intervalId = setInterval(notifyListeners, 1000);
  }
}

function stopInterval() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export function subscribeTime(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  startInterval();

  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0) {
      stopInterval();
    }
  };
}

export function getTimeSnapshot(): LocalTimeDisplay {
  return clientSnapshot;
}

export function getServerTimeSnapshot(): LocalTimeDisplay {
  return serverSnapshot;
}
