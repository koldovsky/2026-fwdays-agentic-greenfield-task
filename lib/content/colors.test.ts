import { describe, it, expect } from 'vitest'
import { NOTE_COLORS, DEFAULT_NOTE_COLOR, isNoteColor } from './colors'

describe('NOTE_COLORS', () => {
  it('has exactly 8 colors, each with a non-empty label', () => {
    expect(NOTE_COLORS).toHaveLength(8)
    for (const c of NOTE_COLORS) {
      expect(typeof c.value).toBe('string')
      expect(c.label.length).toBeGreaterThan(0)
    }
  })

  it('covers the full highlighter spectrum', () => {
    expect(NOTE_COLORS.map((c) => c.value)).toEqual([
      'yellow', 'amber', 'coral', 'pink', 'purple', 'blue', 'teal', 'green',
    ])
  })
})

describe('DEFAULT_NOTE_COLOR', () => {
  it('is yellow', () => {
    expect(DEFAULT_NOTE_COLOR).toBe('yellow')
  })
})

describe('isNoteColor', () => {
  it('accepts a known color', () => {
    expect(isNoteColor('green')).toBe(true)
  })
  it('rejects an unknown color', () => {
    expect(isNoteColor('chartreuse')).toBe(false)
  })
})
