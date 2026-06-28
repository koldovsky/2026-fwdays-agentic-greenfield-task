"use client";

import { useState, useEffect } from "react";
import { uk } from "@/lib/i18n/uk";

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function localIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export function TopClock() {
  // null on first render (server + client hydration) → no hydration mismatch.
  // setState is only called from timer callbacks, never directly in the effect
  // body, which satisfies the react-hooks/set-state-in-effect rule.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timeoutId = setTimeout(tick, 0);
    const intervalId = setInterval(tick, 1000);
    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  if (now === null) return null;

  const timeStr = formatTime(now);

  return (
    <time
      dateTime={localIso(now)}
      aria-label={`${uk.regions.clock}: ${timeStr}`}
      className="font-mono text-sm tabular-nums text-text-secondary"
    >
      {timeStr}
    </time>
  );
}
