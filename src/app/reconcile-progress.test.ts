import { describe, expect, it } from 'vitest'
import { MEDIA_TYPE_EPUB, type Locator } from '@/core/model'
import { CONFLICT_EPSILON, reconcileOnOpen } from './reconcile-progress'

const at = (totalProgression: number): Locator => ({
  href: 'book-1',
  type: MEDIA_TYPE_EPUB,
  locations: { totalProgression },
})

describe('reconcileOnOpen — Komga source of truth, ask-when-ahead', () => {
  it('resumes the local position when Komga is behind (the outbox pushes local up)', () => {
    const result = reconcileOnOpen(at(0.6), at(0.3))
    expect(result.restore).toEqual(at(0.6))
    expect(result.conflict).toBeNull()
  })

  it('resumes local and raises a conflict when Komga is meaningfully ahead', () => {
    const local = at(0.3)
    const remote = at(0.8)
    const result = reconcileOnOpen(local, remote)
    expect(result.restore).toBe(local) // resume where this device is…
    expect(result.conflict).toEqual({ remote, localProgression: 0.3, remoteProgression: 0.8 }) // …but ask
  })

  it('resumes straight from Komga when ahead and there is no local position (first time on device)', () => {
    const remote = at(0.5)
    const result = reconcileOnOpen(null, remote)
    expect(result.restore).toBe(remote)
    expect(result.conflict).toBeNull()
  })

  it('does NOT prompt for a sub-epsilon difference (grid quantisation / our own floored writes)', () => {
    const local = at(0.5)
    const result = reconcileOnOpen(local, at(0.5 + CONFLICT_EPSILON / 2))
    expect(result.restore).toBe(local)
    expect(result.conflict).toBeNull()
  })

  it('falls back to remote when there is no local and Komga is not ahead of zero', () => {
    expect(reconcileOnOpen(null, null).restore).toBeNull()
    const remote = at(0)
    expect(reconcileOnOpen(null, remote).restore).toBe(remote)
  })

  it('treats a remote locator with no totalProgression as not-ahead (no false prompt)', () => {
    const local = at(0.4)
    const remoteNoProgress: Locator = { href: 'book-1', type: MEDIA_TYPE_EPUB, locations: {} }
    const result = reconcileOnOpen(local, remoteNoProgress)
    expect(result.restore).toBe(local)
    expect(result.conflict).toBeNull()
  })
})
