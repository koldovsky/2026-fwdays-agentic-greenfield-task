import { describe, it, expect } from 'vitest'
import { bookMetaFromForm, noteFromForm } from '@/lib/content/forms'

function form(entries: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(entries)) fd.set(k, v)
  return fd
}

describe('bookMetaFromForm', () => {
  it('parses fields, status, coverColor, and tags', () => {
    const meta = bookMetaFromForm(form({
      title: 'Atomic Habits', author: 'James Clear', status: 'finished',
      coverColor: 'blue', rating: '9', dateRead: '2026-05-10',
      tags: 'nonfiction, psychology', summary: 'S',
    }))
    expect(meta).toEqual({
      title: 'Atomic Habits', author: 'James Clear', status: 'finished',
      coverColor: 'blue', rating: 9, dateRead: '2026-05-10',
      tags: ['nonfiction', 'psychology'], summary: 'S',
    })
  })
  it('defaults bad status to toread and omits empty optionals', () => {
    const meta = bookMetaFromForm(form({ title: 'T', author: 'A', status: 'bad', rating: '', tags: '' }))
    expect(meta.status).toBe('toread')
    expect(meta.rating).toBeUndefined()
    expect(meta.coverColor).toBeUndefined()
    expect(meta.tags).toEqual([])
  })
})

describe('noteFromForm', () => {
  it('parses a note with excerpt, page, and links', () => {
    const { slug, note } = noteFromForm(form({
      slug: 'deep-work', id: 'n-1', color: 'green', excerpt: 'A quote', page: '88',
      body: 'Reflection', links: 'book:atomic-habits\nnote:x/n-9',
    }))
    expect(slug).toBe('deep-work')
    expect(note).toEqual({
      id: 'n-1', color: 'green', excerpt: 'A quote', page: 88, body: 'Reflection',
      links: ['book:atomic-habits', 'note:x/n-9'],
    })
  })
  it('defaults invalid color and omits empty excerpt/page', () => {
    const { note } = noteFromForm(form({ slug: 's', id: 'n-1', color: 'bad', body: '', links: '' }))
    expect(note.color).toBe('yellow')
    expect(note.excerpt).toBeUndefined()
    expect(note.page).toBeUndefined()
    expect(note.links).toEqual([])
  })
})
