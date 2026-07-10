import { describe, expect, it } from 'vitest'
import { furthestWins } from '@/core/sync'
import type { Locator } from '@/core/model'

const at = (totalProgression: number): Locator => ({
  href: '/c',
  type: 'application/epub+zip',
  locations: { totalProgression },
})

describe('furthestWins', () => {
  it('keeps the locator with the greater total progression, regardless of order', () => {
    const behind = at(0.2)
    const ahead = at(0.6)
    expect(furthestWins(behind, ahead)).toBe(ahead)
    expect(furthestWins(ahead, behind)).toBe(ahead)
  })

  it('treats a missing progression as zero', () => {
    const unknown: Locator = { href: '/c', type: 'application/pdf' }
    const known = at(0.1)
    expect(furthestWins(unknown, known)).toBe(known)
  })
})
