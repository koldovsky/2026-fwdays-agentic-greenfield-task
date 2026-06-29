import matter from 'gray-matter'
import fs from 'node:fs/promises'
import type { Note } from './types'
import { noteFile, notesDir } from './paths'
import { atomicWrite, readFileOr, listFiles } from './fs-utils'
import { DEFAULT_NOTE_COLOR, isNoteColor } from './colors'

export function parseNote(id: string, raw: string): Note {
  const { data, content } = matter(raw)
  const color = typeof data.color === 'string' && isNoteColor(data.color) ? data.color : DEFAULT_NOTE_COLOR
  const links = Array.isArray(data.links)
    ? data.links.filter((x): x is string => typeof x === 'string')
    : []
  const excerpt = typeof data.excerpt === 'string' && data.excerpt.length > 0 ? data.excerpt : undefined
  const page = typeof data.page === 'number' ? data.page : undefined
  const note: Note = { id, color, links, body: content.trim() }
  if (excerpt !== undefined) note.excerpt = excerpt
  if (page !== undefined) note.page = page
  return note
}

export function serializeNote(note: Note): string {
  const meta: Record<string, unknown> = { id: note.id, color: note.color }
  if (note.excerpt) meta.excerpt = note.excerpt
  if (note.page !== undefined) meta.page = note.page
  meta.links = note.links
  return matter.stringify(note.body ? `${note.body}\n` : '', meta)
}

export async function readNote(slug: string, id: string): Promise<Note | null> {
  const raw = await readFileOr(noteFile(slug, id), null)
  if (raw === null) return null
  return parseNote(id, raw)
}

export async function listNotes(slug: string): Promise<Note[]> {
  const files = await listFiles(notesDir(slug), '.md')
  const notes = await Promise.all(files.map((f) => readNote(slug, f.replace(/\.md$/, ''))))
  return notes
    .filter((n): n is Note => n !== null)
    .sort((a, b) => a.id.localeCompare(b.id))
}

export async function saveNote(slug: string, note: Note): Promise<void> {
  await atomicWrite(noteFile(slug, note.id), serializeNote(note))
}

export async function deleteNote(slug: string, id: string): Promise<void> {
  await fs.rm(noteFile(slug, id), { force: true })
}

export function newNoteId(): string {
  return 'n-' + Math.random().toString(36).slice(2, 8)
}
