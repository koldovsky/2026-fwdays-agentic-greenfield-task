import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { calculateStreak } from './streak'

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

describe('calculateStreak', () => {
  it('returns 0 for no logs', () => {
    expect(calculateStreak([])).toBe(0)
  })

  it('returns 1 for first day (today only)', () => {
    expect(calculateStreak([daysAgo(0)])).toBe(1)
  })

  it('counts consecutive days correctly', () => {
    const logs = [daysAgo(0), daysAgo(1), daysAgo(2)]
    expect(calculateStreak(logs)).toBe(3)
  })

  it('resets to 1 when the most recent day is today but yesterday is missing', () => {
    const logs = [daysAgo(0), daysAgo(2), daysAgo(3)]
    expect(calculateStreak(logs)).toBe(1)
  })

  it('resets to 0 when today has no entry', () => {
    const logs = [daysAgo(1), daysAgo(2), daysAgo(3)]
    expect(calculateStreak(logs)).toBe(0)
  })

  it('deduplicates multiple logs on the same day', () => {
    const today = daysAgo(0)
    const yesterday = daysAgo(1)
    expect(calculateStreak([today, today, yesterday, yesterday])).toBe(2)
  })

  it('handles a long streak', () => {
    const logs = Array.from({ length: 30 }, (_, i) => daysAgo(i))
    expect(calculateStreak(logs)).toBe(30)
  })
})
