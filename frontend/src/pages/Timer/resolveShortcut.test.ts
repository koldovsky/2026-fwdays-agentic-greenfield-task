// @trace FR-TIMER-05
//
// RED unit test (spec 003) for the pure keyboard-shortcut mapper the Timer screen
// calls: `resolveShortcut(key, state)` maps a KeyboardEvent key + current timer state
// to a timer action or null. Space starts/pauses/continues (context-dependent), S
// stops and saves, Esc triggers discard; every other key is a no-op. At RED this fails
// because `./resolveShortcut` does not exist yet — the intended missing-module reason.

import { describe, expect, it } from 'vitest'

import { resolveShortcut } from './resolveShortcut'

type TimerState = 'idle' | 'running' | 'paused'

const ALL_STATES: readonly TimerState[] = ['idle', 'running', 'paused']

describe('resolveShortcut (FR-TIMER-05)', () => {
  it('Space is context-dependent: start when idle, pause when running, continue when paused', () => {
    expect(resolveShortcut(' ', 'idle')).toBe('start')
    expect(resolveShortcut(' ', 'running')).toBe('pause')
    expect(resolveShortcut(' ', 'paused')).toBe('continue')
  })

  it('S (either case) stops from running or paused, and is null when idle', () => {
    expect(resolveShortcut('s', 'running')).toBe('stop')
    expect(resolveShortcut('s', 'paused')).toBe('stop')
    expect(resolveShortcut('S', 'running')).toBe('stop')
    expect(resolveShortcut('S', 'paused')).toBe('stop')
    expect(resolveShortcut('s', 'idle')).toBeNull()
    expect(resolveShortcut('S', 'idle')).toBeNull()
  })

  it('Escape triggers discard from running or paused, and is null when idle', () => {
    expect(resolveShortcut('Escape', 'running')).toBe('discard')
    expect(resolveShortcut('Escape', 'paused')).toBe('discard')
    expect(resolveShortcut('Escape', 'idle')).toBeNull()
  })

  it('any other key maps to null in every state', () => {
    for (const state of ALL_STATES) {
      expect(resolveShortcut('a', state)).toBeNull()
      expect(resolveShortcut('Enter', state)).toBeNull()
      expect(resolveShortcut('1', state)).toBeNull()
      expect(resolveShortcut('Tab', state)).toBeNull()
    }
  })
})
