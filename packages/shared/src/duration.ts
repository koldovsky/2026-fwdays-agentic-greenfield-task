/**
 * Pure duration formatting. Honeydo shows durations as friendly, human strings
 * (see the design system voice): a running clock like "1:24:08" and compact
 * totals like "6h 12m" / "32m" — never "0h 32m 00s".
 */

/** Clamp to whole, non-negative seconds. */
function normalize(totalSec: number): number {
  if (!Number.isFinite(totalSec) || totalSec < 0) return 0;
  return Math.floor(totalSec);
}

/**
 * Clock readout for a running/elapsed timer.
 * `M:SS` under an hour, `H:MM:SS` at an hour or more. e.g. 32m → "32:00",
 * 5048s → "1:24:08".
 */
export function formatDurationClock(totalSec: number): string {
  const s = normalize(totalSec);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const ss = String(seconds).padStart(2, '0');
  if (hours > 0) {
    const mm = String(minutes).padStart(2, '0');
    return `${hours}:${mm}:${ss}`;
  }
  return `${minutes}:${ss}`;
}

/**
 * Compact total for summaries. "6h 12m", "32m", "45s". Drops zero leading units
 * and omits seconds once there is at least a minute.
 */
export function formatDurationCompact(totalSec: number): string {
  const s = normalize(totalSec);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
}
