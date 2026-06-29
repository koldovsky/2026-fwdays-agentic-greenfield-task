import matter from 'gray-matter'
import type { Book, BookMeta, BookStatus, CoverColor } from './types'
import { bookFile, booksDir } from './paths'
import { atomicWrite, readFileOr, listDirs } from './fs-utils'
import { slugify } from './slug'

const STATUSES: BookStatus[] = ['reading', 'finished', 'toread']
const COVER_COLORS: CoverColor[] = ['blue', 'coral', 'teal', 'purple', 'amber', 'green', 'ink']

function asString(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

export function parseBook(slug: string, raw: string): Book {
  const { data, content } = matter(raw)
  const title = asString(data.title)
  const author = asString(data.author)
  const malformed = !title || !author
  const status = STATUSES.includes(data.status) ? (data.status as BookStatus) : 'toread'
  const coverColor = COVER_COLORS.includes(data.coverColor)
    ? (data.coverColor as CoverColor)
    : undefined
  const rating =
    typeof data.rating === 'number' && data.rating >= 1 && data.rating <= 10
      ? Math.round(data.rating)
      : undefined

  return {
    slug,
    title: title ?? slug,
    author: author ?? '',
    cover: asString(data.cover),
    coverColor,
    status,
    dateRead: asString(data.dateRead),
    rating,
    tags: asStringArray(data.tags),
    summary: asString(data.summary),
    body: content.trim(),
    malformed,
  }
}

export function serializeBook(book: Book): string {
  const meta: Record<string, unknown> = {
    title: book.title,
    author: book.author,
    status: book.status,
    tags: book.tags,
  }
  if (book.cover) meta.cover = book.cover
  if (book.coverColor) meta.coverColor = book.coverColor
  if (book.dateRead) meta.dateRead = book.dateRead
  if (book.rating !== undefined) meta.rating = book.rating
  if (book.summary) meta.summary = book.summary
  return matter.stringify(book.body ? `${book.body}\n` : '', meta)
}

export async function readBook(slug: string): Promise<Book | null> {
  const raw = await readFileOr(bookFile(slug), null)
  if (raw === null) return null
  return parseBook(slug, raw)
}

export async function listBooks(): Promise<Book[]> {
  const slugs = await listDirs(booksDir())
  const books = await Promise.all(slugs.map((s) => readBook(s)))
  return books
    .filter((b): b is Book => b !== null)
    .sort((a, b) => a.title.localeCompare(b.title))
}

async function uniqueSlug(desired: string): Promise<string> {
  const existing = new Set(await listDirs(booksDir()))
  if (!existing.has(desired)) return desired
  for (let i = 2; ; i++) {
    const candidate = `${desired}-${i}`
    if (!existing.has(candidate)) return candidate
  }
}

export async function createBook(meta: BookMeta, body = '', desiredSlug?: string): Promise<string> {
  const base = slugify(desiredSlug || meta.title)
  const slug = await uniqueSlug(base)
  const book: Book = { slug, body, malformed: false, ...meta }
  await atomicWrite(bookFile(slug), serializeBook(book))
  return slug
}

export async function updateBook(slug: string, meta: BookMeta, body: string): Promise<void> {
  const book: Book = { slug, body, malformed: false, ...meta }
  await atomicWrite(bookFile(slug), serializeBook(book))
}
