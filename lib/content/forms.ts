import type { BookMeta, BookStatus, CoverColor, Note } from './types'
import { isNoteColor, DEFAULT_NOTE_COLOR } from './colors'

const STATUSES: BookStatus[] = ['reading', 'finished', 'toread']
const COVER_COLORS: CoverColor[] = ['blue', 'coral', 'teal', 'purple', 'amber', 'green', 'ink']

export function str(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === 'string' ? v.trim() : ''
}

export function bookMetaFromForm(fd: FormData): BookMeta {
  const status = STATUSES.includes(str(fd, 'status') as BookStatus) ? (str(fd, 'status') as BookStatus) : 'toread'
  const rating = str(fd, 'rating') ? Number(str(fd, 'rating')) : undefined
  const coverColor = COVER_COLORS.includes(str(fd, 'coverColor') as CoverColor)
    ? (str(fd, 'coverColor') as CoverColor)
    : undefined
  const meta: BookMeta = {
    title: str(fd, 'title'),
    author: str(fd, 'author'),
    status,
    tags: str(fd, 'tags').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean),
  }
  if (rating && rating >= 1 && rating <= 10) meta.rating = Math.round(rating)
  if (coverColor) meta.coverColor = coverColor
  if (str(fd, 'dateRead')) meta.dateRead = str(fd, 'dateRead')
  if (str(fd, 'summary')) meta.summary = str(fd, 'summary')
  return meta
}

export function noteFromForm(fd: FormData): { slug: string; note: Note } {
  const color = str(fd, 'color')
  const pageRaw = str(fd, 'page')
  const note: Note = {
    id: str(fd, 'id'),
    color: isNoteColor(color) ? color : DEFAULT_NOTE_COLOR,
    links: str(fd, 'links').split(/[\n,]/).map((l) => l.trim()).filter(Boolean),
    body: str(fd, 'body'),
  }
  if (str(fd, 'excerpt')) note.excerpt = str(fd, 'excerpt')
  if (pageRaw && Number.isFinite(Number(pageRaw))) note.page = Number(pageRaw)
  return { slug: str(fd, 'slug'), note }
}
