/**
 * Live-ticking elapsed clock for the running entry. Ticks locally every second and
 * formats via the shared pure `formatDurationHms` (FR-ENTRY-09) — the elapsed readout
 * is cosmetic; the server owns the real start/stop times.
 */
import { useEffect, useState } from 'react';
import { formatDurationHms } from '@honeydo/shared';

/**
 * Returns the `h:mm:ss` elapsed string since `startedAt`, updating each second while
 * `active`. When `startedAt` is null (nothing running) it returns `0:00:00`.
 */
export function useElapsed(startedAt: string | null, active = true): string {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active || !startedAt) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active, startedAt]);

  if (!startedAt) return formatDurationHms(0);
  return formatDurationHms((now - new Date(startedAt).getTime()) / 1000);
}
