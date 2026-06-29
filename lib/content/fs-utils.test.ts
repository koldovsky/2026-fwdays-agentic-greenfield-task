import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { atomicWrite, readFileOr, listDirs, listFiles } from './fs-utils'

let dir: string
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bs-fs-'))
})
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('atomicWrite', () => {
  it('creates parent dirs and writes file', async () => {
    const target = path.join(dir, 'a', 'b', 'file.md')
    await atomicWrite(target, 'hello')
    expect(await fs.readFile(target, 'utf8')).toBe('hello')
  })

  it('overwrites existing file', async () => {
    const target = path.join(dir, 'file.md')
    await atomicWrite(target, 'one')
    await atomicWrite(target, 'two')
    expect(await fs.readFile(target, 'utf8')).toBe('two')
  })

  it('leaves no temp files behind', async () => {
    const target = path.join(dir, 'file.md')
    await atomicWrite(target, 'x')
    expect(await fs.readdir(dir)).toEqual(['file.md'])
  })
})

describe('readFileOr', () => {
  it('returns contents when present', async () => {
    const target = path.join(dir, 'f.txt')
    await fs.writeFile(target, 'data')
    expect(await readFileOr(target, null)).toBe('data')
  })
  it('returns fallback when missing', async () => {
    expect(await readFileOr(path.join(dir, 'nope.txt'), null)).toBeNull()
  })
})

describe('listDirs / listFiles', () => {
  it('returns [] for missing dir', async () => {
    expect(await listDirs(path.join(dir, 'missing'))).toEqual([])
    expect(await listFiles(path.join(dir, 'missing'), '.md')).toEqual([])
  })
  it('lists subdirs and matching files', async () => {
    await fs.mkdir(path.join(dir, 'sub'))
    await fs.writeFile(path.join(dir, 'a.md'), '')
    await fs.writeFile(path.join(dir, 'b.txt'), '')
    expect(await listDirs(dir)).toEqual(['sub'])
    expect(await listFiles(dir, '.md')).toEqual(['a.md'])
  })
})
