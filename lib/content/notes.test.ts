import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { parseNote, serializeNote, listNotes, readNote, saveNote, deleteNote } from './notes'
import type { Note } from './types'

let dir: string
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bs-notes-'))
  process.env.BOOKSHELF_CONTENT_DIR = dir
})
afterEach(async () => {
  delete process.env.BOOKSHELF_CONTENT_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

const note: Note = {
  id: 'n-a1',
  color: 'green',
  excerpt: 'Every action you take is a vote for the person you wish to become',
  page: 88,
  links: ['book:deep-work', 'note:deep-work/n-x9'],
  body: 'A quote worth keeping — reflection here',
}

describe('parseNote', () => {
  it('round-trips', () => {
    expect(parseNote('n-a1', serializeNote(note))).toEqual(note)
  })
  it('defaults invalid color, omits absent excerpt/page, empty links', () => {
    const parsed = parseNote('n-a1', '---\ncolor: chartreuse\n---\nbody')
    expect(parsed.color).toBe('yellow')
    expect(parsed.excerpt).toBeUndefined()
    expect(parsed.page).toBeUndefined()
    expect(parsed.links).toEqual([])
    expect(parsed.body).toBe('body')
  })
})

describe('note store', () => {
  it('saves and reads a note', async () => {
    await saveNote('deep-work', note)
    expect(await readNote('deep-work', 'n-a1')).toEqual(note)
  })

  it('readNote returns null when missing', async () => {
    expect(await readNote('deep-work', 'nope')).toBeNull()
  })

  it('lists notes sorted by id', async () => {
    await saveNote('deep-work', { ...note, id: 'n-b' })
    await saveNote('deep-work', { ...note, id: 'n-a' })
    const notes = await listNotes('deep-work')
    expect(notes.map((n) => n.id)).toEqual(['n-a', 'n-b'])
  })

  it('returns [] for a book with no notes', async () => {
    expect(await listNotes('empty')).toEqual([])
  })

  it('deletes a note', async () => {
    await saveNote('deep-work', note)
    await deleteNote('deep-work', note.id)
    expect(await readNote('deep-work', note.id)).toBeNull()
  })
})
