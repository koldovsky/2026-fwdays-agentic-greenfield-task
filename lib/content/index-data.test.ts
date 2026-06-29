import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createBook } from './books'
import { saveNote } from './notes'
import { loadBacklinkIndex } from './index-data'

let dir: string
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bs-idx-'))
  process.env.BOOKSHELF_CONTENT_DIR = dir
})
afterEach(async () => {
  delete process.env.BOOKSHELF_CONTENT_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

describe('loadBacklinkIndex', () => {
  it('builds backlinks across books on disk', async () => {
    const a = await createBook({ title: 'A', author: '', status: 'finished', tags: [] })
    const b = await createBook({ title: 'B', author: '', status: 'finished', tags: [] })
    await saveNote(a, { id: 'n-1', color: 'yellow', links: [`book:${b}`], body: '' })
    const index = await loadBacklinkIndex()
    expect(index.get(`book:${b}`)).toEqual([{ fromBook: a, fromNote: 'n-1' }])
  })
})
