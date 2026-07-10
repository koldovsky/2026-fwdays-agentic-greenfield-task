"use client";

import { useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "saving" | "saved";

/** Wait for a natural typing pause before persisting text fields. */
export const AUTOSAVE_DEBOUNCE_MS = 1200;

export type DebouncedCallback<T extends (...args: never[]) => void> = T & {
  flush: () => void;
  cancel: () => void;
};

export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delayMs: number,
): DebouncedCallback<T> {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestArgsRef = useRef<Parameters<T> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const cancel = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const flush = () => {
    if (!latestArgsRef.current) {
      return;
    }

    cancel();
    callbackRef.current(...latestArgsRef.current);
  };

  const debounced = ((...args: Parameters<T>) => {
    latestArgsRef.current = args;
    cancel();

    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      callbackRef.current(...args);
    }, delayMs);
  }) as DebouncedCallback<T>;

  debounced.flush = flush;
  debounced.cancel = cancel;

  return debounced;
}

export function useAutosaveStatus(): [
  AutosaveStatus,
  (status: AutosaveStatus) => void,
] {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
    };
  }, []);

  const setAutosaveStatus = (nextStatus: AutosaveStatus) => {
    setStatus(nextStatus);

    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
    }

    if (nextStatus === "saved") {
      resetTimerRef.current = setTimeout(() => setStatus("idle"), 2000);
    }
  };

  return [status, setAutosaveStatus];
}
