"use client";

import { useSyncExternalStore } from "react";

import {
  getServerTimeSnapshot,
  getTimeSnapshot,
  subscribeTime,
} from "@/lib/clock/time-store";
import { t } from "@/lib/i18n";

export function HeaderClock() {
  const { display, dateTime } = useSyncExternalStore(
    subscribeTime,
    getTimeSnapshot,
    getServerTimeSnapshot,
  );

  return (
    <time
      dateTime={dateTime}
      aria-label={t("clock.label")}
      suppressHydrationWarning
      className="min-w-[5.5rem] font-mono text-sm tabular-nums text-muted-foreground"
    >
      {display}
    </time>
  );
}
