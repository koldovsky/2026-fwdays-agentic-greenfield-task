import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createBook } from './books'
import { saveNote } from './notes'
import { buildGraph } from './graph'

let dir: string
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bs-graph-'))
  process.env.BOOKSHELF_CONTENT_DIR = dir
})
afterEach(async () => {
  delete process.env.BOOKSHELF_CONTENT_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

describe('buildGraph', () => {
  it('builds undirected book edges from note links, skipping self/broken', async () => {
    const a = await createBook({ title: 'Alpha', author: '', status: 'finished', tags: [] })
    const b = await createBook({ title: 'Bravo', author: '', status: 'finished', tags: [] })
    const c = await createBook({ title: 'Charlie', author: '', status: 'finished', tags: [] })
    // a -> b (book link), a -> c (note link), a -> a (self, skipped), a -> ghost (broken, skipped)
    await saveNote(a, { id: 'n-1', color: 'yellow', links: [`book:${b}`, `note:${c}/n-1`, `book:${a}`, 'book:ghost'], body: '' })
    await saveNote(c, { id: 'n-1', color: 'green', links: [], body: '' })

    const { nodes, edges } = await buildGraph()
    const slugs = nodes.map((n) => n.slug).sort()
    expect(slugs).toEqual([a, b, c].sort())
    const keys = edges.map((e) => [e.from, e.to].sort().join('|')).sort()
    expect(keys).toEqual([[a, b].sort().join('|'), [a, c].sort().join('|')].sort())
  })

  it('omits unconnected books', async () => {
    await createBook({ title: 'Lonely', author: '', status: 'finished', tags: [] })
    const { nodes } = await buildGraph()
    expect(nodes).toEqual([])
  })
})
