// Pure keyboard-shortcut mapper for the Timer screen (FR-TIMER-05). The Timer
// component listens on window keydown and calls this to turn a key + the current
// timer state into a timer action (or null). Kept pure and framework-free so it
// is unit-tested without React: Space is context-dependent (start/pause/continue),
// S stops and saves, Esc opens the discard confirmation, every other key is a no-op.

export type TimerState = 'idle' | 'running' | 'paused'
export type TimerAction = 'start' | 'pause' | 'continue' | 'stop' | 'discard'

export function resolveShortcut(key: string, state: TimerState): TimerAction | null {
  if (key === ' ') {
    if (state === 'idle') return 'start'
    if (state === 'running') return 'pause'
    return 'continue' // paused
  }
  if (key === 's' || key === 'S') {
    return state === 'idle' ? null : 'stop'
  }
  if (key === 'Escape') {
    return state === 'idle' ? null : 'discard'
  }
  return null
}
