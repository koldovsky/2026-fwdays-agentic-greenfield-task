import { describe, it, expect } from 'vitest'
import { groupBooksByTag } from './queries'
import type { Book } from './types'

const mk = (slug: string, tags: string[]): Book => ({
  slug, title: slug, author: '', status: 'finished', tags, body: '', malformed: false,
})

describe('groupBooksByTag', () => {
  it('groups books under each tag, alphabetically', () => {
    const groups = groupBooksByTag([mk('a', ['x', 'y']), mk('b', ['x'])])
    expect(groups.map((g) => g.tag)).toEqual(['x', 'y'])
    expect(groups[0].books.map((b) => b.slug)).toEqual(['a', 'b'])
    expect(groups[1].books.map((b) => b.slug)).toEqual(['a'])
  })
  it('collects untagged books under "Untagged"', () => {
    const groups = groupBooksByTag([mk('a', [])])
    expect(groups).toEqual([{ tag: 'Untagged', books: [mk('a', [])] }])
  })
})
