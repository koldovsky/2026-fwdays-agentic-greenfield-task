// Pure display helpers for the Timer screen and session log — no React, no HTTP.

import type { ActiveTimer } from '../../api'

/** Whole seconds to ``HH:MM:SS`` (zero-padded). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n: number): string => n.toString().padStart(2, '0')
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}`
}

/**
 * Net elapsed seconds for a live timer: wall time since ``started_at`` minus the
 * accumulated pauses, frozen at the pause moment while paused so the display
 * "freezes" (FR-TIMER-02). Derived locally from the server's authoritative state.
 */
export function elapsedSeconds(active: ActiveTimer, nowMs: number): number {
  const startedMs = Date.parse(active.started_at)
  let pausedMs = 0
  for (const pause of active.accumulated_pauses) {
    pausedMs += Date.parse(pause.resumed_at) - Date.parse(pause.paused_at)
  }
  const anchorMs =
    active.state === 'paused' && active.pause_started_at
      ? Date.parse(active.pause_started_at)
      : nowMs
  return Math.max(0, Math.floor((anchorMs - startedMs - pausedMs) / 1000))
}

/** An ISO-8601 UTC string from a ``datetime-local`` input value, or null if empty/invalid. */
export function localToIso(local: string): string | null {
  if (!local) return null
  const ms = Date.parse(local)
  if (Number.isNaN(ms)) return null
  return new Date(ms).toISOString()
}

/** An ISO-8601 UTC string to a ``datetime-local`` input value (local time, minutes). */
export function isoToLocal(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number): string => n.toString().padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}
