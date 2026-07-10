"use client";

import { useSyncExternalStore } from "react";

import { getTodayMinutesFocused } from "@/lib/completion/record-session";
import { getBrowserStorage } from "@/lib/storage/browser";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("tinystart:change", onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("tinystart:change", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export function MicroRecapStrip() {
  const minutes = useSyncExternalStore(
    subscribe,
    () => getTodayMinutesFocused(getBrowserStorage()),
    () => 0,
  );

  return (
    <section
      aria-label="Today recap"
      className="rounded-lg bg-surface-muted px-4 py-3 text-center text-sm text-foreground-muted"
    >
      Today: {minutes} min focused
    </section>
  );
}
