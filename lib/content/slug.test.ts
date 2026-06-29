import { describe, it, expect } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it('lowercases and dashes ascii', () => {
    expect(slugify('Atomic Habits')).toBe('atomic-habits')
  })
  it('transliterates Ukrainian', () => {
    expect(slugify('Глибока робота')).toBe('hlyboka-robota')
  })
  it('collapses separators and trims dashes', () => {
    expect(slugify('  Hello---World!  ')).toBe('hello-world')
  })
  it('handles apostrophes', () => {
    expect(slugify("П'ять")).toBe('piat')
  })
  it('falls back to "book" for empty input', () => {
    expect(slugify('!!!')).toBe('book')
    expect(slugify('')).toBe('book')
  })
})
