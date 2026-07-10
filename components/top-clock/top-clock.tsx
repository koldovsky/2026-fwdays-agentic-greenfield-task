"use client";

import { useEffect, useState } from "react";
import { uk } from "@/lib/i18n/uk";
import {
  formatLocalTime,
  formatLocalTimeIso,
} from "@/lib/top-clock/format-local-time";

export function TopClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const sync = () => setNow(new Date());
    sync();

    const msUntilNextMinute =
      60_000 - (Date.now() % 60_000) + 50;

    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      sync();
      intervalId = window.setInterval(sync, 60_000);
    }, msUntilNextMinute);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  const label = formatLocalTime(now);

  return (
    <time
      dateTime={formatLocalTimeIso(now)}
      aria-label={uk.clock.label}
      suppressHydrationWarning
      className="rounded-full border border-white/70 bg-white/70 px-3 py-1 text-sm tabular-nums text-[#1a2332] shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#1a2332]/80 dark:text-[#e8edf4]"
    >
      {label}
    </time>
  );
}
