# Bookshelf Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **⚠ Revised 2026-06-27 for the design system.** A generated design system lives in `docs/design-system/` and is the **source of truth for UI**. Data-layer tasks (1–8) use the richer model below. UI tasks (9–15) are built **on the design system's real components and tokens** (vendored into the app in Task 9). Capability IDs `[C…]` in UI task titles map to `docs/requirements.md` §5. Component contracts: `docs/design-system/components/**/<Name>.d.ts` and `.prompt.md`.

**Goal:** Build a local single-device Next.js app for taking notes on books — with ratings, summaries, highlighter-colored note cards (quote + reflection), and wiki-links (with backlinks) between books and notes — storing all data as Markdown + YAML frontmatter files on disk, styled with the `docs/design-system/` component library and tokens.

**Architecture:** Next.js App Router. A single filesystem-access layer (`lib/content/*`) reads/writes Markdown files; the UI only ever touches typed objects through Server Actions. Each book is a folder (`content/books/<slug>/book.md` + `notes/<note-id>.md`). A link/backlink index is built by scanning files. Pure functions (store, links, markdown, slug) are unit-tested with Vitest against a temp content directory. UI is composed from the design system's React components + CSS tokens, with thin app-specific adapters/forms on top.

**Tech Stack:** Next.js 15 (App Router) + React 19 + TypeScript, `gray-matter` (frontmatter), `remark` + `remark-html` (markdown), Vitest + `@testing-library/react` + jsdom (tests). Design system: `docs/design-system/` (React `.jsx` components + CSS token files); fonts (Newsreader / Hanken Grotesk / Spline Sans Mono) and Lucide icons via CDN.

## Global Constraints

- Language/runtime: TypeScript, Node ≥ 20, Next.js App Router (no Pages Router).
- **Git** — repo initialized; work on branch `2026-ai-bookshelf` (remote `origin`). The `git init` steps below are already done; commit steps are active again. Push only when asked.
- Single user, single device. NO auth, NO database, NO cloud, NO full-text search.
- **UI language: English**, sentence case ("Add book"); voice = "a well-read friend", 2nd person; no emoji. See `docs/design-system/readme.md` → Content fundamentals.
- **UI is built on `docs/design-system/`** — use its components (`BookCard`, `NoteCard`, `Rating`, `HighlighterPicker`, `core/*`, `Tabs`, …) and tokens; do not reimplement what it ships.
- All persistent data lives as human-readable `.md` files; the app must never be the only way to read them.
- Only `lib/content/*` and Server Actions may touch the filesystem (`node:fs`). UI components receive typed objects.
- Content root resolves from `process.env.BOOKSHELF_CONTENT_DIR ?? <cwd>/content`. Tests set this env var to a temp dir.
- All file writes are atomic (write temp file, then rename).
- Book status values: `reading` | `finished` | `toread`. Rating: integer 1–10.
- Note colors: `HighlighterKey` = `yellow` | `amber` | `coral` | `pink` | `purple` | `blue` | `teal` | `green` (default `yellow`), each with a fixed meaning (idea / question / disagree / resonates / theme / fact / term / quote).
- A note carries: `color`, optional `excerpt` (quoted passage) + `page`, `links[]`, and a markdown body (your reflection).
- Book cover: image file `cover`, or generated `coverColor` ∈ `blue|coral|teal|purple|amber|green|ink`.
- Tags are hashtags: lowercase, no spaces.
- Link string formats: `book:<slug>` and `note:<slug>/<note-id>`.
- Frontmatter date format: ISO `YYYY-MM-DD`.

---

### Task 1: Project scaffold + tooling

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Test: `lib/smoke.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: working Next.js + Vitest setup. `npm test` runs Vitest; `npm run dev` runs Next.

- [ ] **Step 1: Scaffold Next.js app**

Run (in the project root, which already contains `docs/`):

```bash
npx create-next-app@latest . --ts --app --no-src-dir --no-tailwind --eslint --import-alias "@/*" --use-npm --yes
```

If `create-next-app` refuses because the directory is non-empty, scaffold in a temp dir and copy in:

```bash
npx create-next-app@latest /tmp/bookshelf-scaffold --ts --app --no-src-dir --no-tailwind --eslint --import-alias "@/*" --use-npm --yes
cp -R /tmp/bookshelf-scaffold/. .
rm -rf /tmp/bookshelf-scaffold
```

- [ ] **Step 2: Install runtime + test dependencies**

```bash
npm install gray-matter remark remark-html
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
})
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Add the test script**

In `package.json`, ensure the `"scripts"` block contains:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write the smoke test**

Create `lib/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('toolchain', () => {
  it('runs vitest', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: Run the smoke test (expect PASS)**

Run: `npm test`
Expected: PASS, 1 test passed.

- [ ] **Step 7: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js app with Vitest"
```

---

### Task 2: Domain model — types, paths, color constants

**Files:**
- Create: `lib/content/types.ts`, `lib/content/paths.ts`, `lib/content/colors.ts`
- Test: `lib/content/paths.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - Types: `BookStatus = 'reading' | 'finished' | 'toread'`, `CoverColor`, `HighlighterKey` (8 colors), `BookMeta`, `Book`, `Note`.
  - `contentRoot(): string`, `booksDir(): string`, `bookDir(slug): string`, `bookFile(slug): string`, `notesDir(slug): string`, `noteFile(slug, id): string`.
  - `NOTE_COLORS: { value: HighlighterKey; label: string }[]`, `DEFAULT_NOTE_COLOR`, `isNoteColor`.

- [ ] **Step 1: Write the types**

Create `lib/content/types.ts`:

```ts
export type BookStatus = 'reading' | 'finished' | 'toread'
export type CoverColor = 'blue' | 'coral' | 'teal' | 'purple' | 'amber' | 'green' | 'ink'

// Matches docs/design-system/components/book/HighlighterPicker.d.ts
export type HighlighterKey =
  | 'yellow' | 'amber' | 'coral' | 'pink' | 'purple' | 'blue' | 'teal' | 'green'

export interface BookMeta {
  title: string
  author: string
  cover?: string           // relative image filename inside the book folder
  coverColor?: CoverColor  // generated cover when no image
  status: BookStatus
  dateRead?: string        // ISO YYYY-MM-DD
  rating?: number          // integer 1..10
  tags: string[]           // hashtags, lowercase, no spaces
  summary?: string
}

export interface Book extends BookMeta {
  slug: string
  body: string             // extended summary markdown (book.md body)
  malformed: boolean       // true when frontmatter failed validation
}

export interface Note {
  id: string               // e.g. "n-a1b2"
  color: HighlighterKey
  excerpt?: string         // the quoted passage
  page?: number            // page reference
  links: string[]          // "book:<slug>" | "note:<slug>/<id>"
  body: string             // markdown — your reflection
}
```

- [ ] **Step 2: Write the color constants**

Create `lib/content/colors.ts`:

```ts
import type { HighlighterKey } from './types'

// 8 highlighter colors from the design system, each with a fixed meaning.
// Labels are English (UI language). Order matches HighlighterPicker swatch row.
export const NOTE_COLORS: { value: HighlighterKey; label: string }[] = [
  { value: 'yellow', label: 'Idea' },
  { value: 'amber', label: 'Question' },
  { value: 'coral', label: 'Disagree' },
  { value: 'pink', label: 'Resonates' },
  { value: 'purple', label: 'Theme' },
  { value: 'blue', label: 'Fact' },
  { value: 'teal', label: 'Term' },
  { value: 'green', label: 'Quote' },
]

export const DEFAULT_NOTE_COLOR: HighlighterKey = 'yellow'

export function isNoteColor(value: string): value is HighlighterKey {
  return NOTE_COLORS.some((c) => c.value === value)
}
```

- [ ] **Step 3: Write the failing path test**

Create `lib/content/paths.test.ts`:

```ts
import { describe, it, expect, afterEach } from 'vitest'
import path from 'node:path'
import { contentRoot, booksDir, bookDir, bookFile, notesDir, noteFile } from './paths'

afterEach(() => {
  delete process.env.BOOKSHELF_CONTENT_DIR
})

describe('paths', () => {
  it('uses BOOKSHELF_CONTENT_DIR when set', () => {
    process.env.BOOKSHELF_CONTENT_DIR = '/tmp/bs'
    expect(contentRoot()).toBe('/tmp/bs')
  })

  it('falls back to cwd/content', () => {
    expect(contentRoot()).toBe(path.join(process.cwd(), 'content'))
  })

  it('builds book and note paths', () => {
    process.env.BOOKSHELF_CONTENT_DIR = '/tmp/bs'
    expect(booksDir()).toBe('/tmp/bs/books')
    expect(bookDir('deep-work')).toBe('/tmp/bs/books/deep-work')
    expect(bookFile('deep-work')).toBe('/tmp/bs/books/deep-work/book.md')
    expect(notesDir('deep-work')).toBe('/tmp/bs/books/deep-work/notes')
    expect(noteFile('deep-work', 'n-1')).toBe('/tmp/bs/books/deep-work/notes/n-1.md')
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- lib/content/paths.test.ts`
Expected: FAIL — cannot find module `./paths`.

- [ ] **Step 5: Write the paths implementation**

Create `lib/content/paths.ts`:

```ts
import path from 'node:path'

export function contentRoot(): string {
  return process.env.BOOKSHELF_CONTENT_DIR ?? path.join(process.cwd(), 'content')
}

export function booksDir(): string {
  return path.join(contentRoot(), 'books')
}

export function bookDir(slug: string): string {
  return path.join(booksDir(), slug)
}

export function bookFile(slug: string): string {
  return path.join(bookDir(slug), 'book.md')
}

export function notesDir(slug: string): string {
  return path.join(bookDir(slug), 'notes')
}

export function noteFile(slug: string, id: string): string {
  return path.join(notesDir(slug), `${id}.md`)
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- lib/content/paths.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add lib/content/
git commit -m "feat: add content domain types, paths, and color constants"
```

---

### Task 3: Atomic filesystem utilities

**Files:**
- Create: `lib/content/fs-utils.ts`
- Test: `lib/content/fs-utils.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `atomicWrite(filePath: string, contents: string): Promise<void>` — ensures parent dir exists, writes to a temp file in the same dir, then renames over the target.
  - `readFileOr(filePath: string, fallback: T): Promise<string | T>` — reads file text or returns fallback if it doesn't exist.
  - `listDirs(dir: string): Promise<string[]>` — names of immediate subdirectories (empty array if dir missing).
  - `listFiles(dir: string, ext: string): Promise<string[]>` — names of files with the given extension (empty array if dir missing).

- [ ] **Step 1: Write the failing test**

Create `lib/content/fs-utils.test.ts`:

```ts
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
    const entries = await fs.readdir(dir)
    expect(entries).toEqual(['file.md'])
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/content/fs-utils.test.ts`
Expected: FAIL — cannot find module `./fs-utils`.

- [ ] **Step 3: Write the implementation**

Create `lib/content/fs-utils.ts`:

```ts
import fs from 'node:fs/promises'
import path from 'node:path'

export async function atomicWrite(filePath: string, contents: string): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  const tmp = path.join(dir, `.${path.basename(filePath)}.tmp-${process.pid}`)
  await fs.writeFile(tmp, contents, 'utf8')
  await fs.rename(tmp, filePath)
}

export async function readFileOr<T>(filePath: string, fallback: T): Promise<string | T> {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return fallback
    throw err
  }
}

export async function listDirs(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort()
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}

export async function listFiles(dir: string, ext: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(ext))
      .map((e) => e.name)
      .sort()
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw err
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/content/fs-utils.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add lib/content/fs-utils.ts lib/content/fs-utils.test.ts
git commit -m "feat: add atomic write and directory listing fs utilities"
```

---

### Task 4: Slug generation (Ukrainian transliteration)

**Files:**
- Create: `lib/content/slug.ts`
- Test: `lib/content/slug.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `slugify(title: string): string` — transliterates Ukrainian Cyrillic to Latin, lowercases, replaces non-alphanumerics with single dashes, trims dashes. Returns `'book'` for empty/symbol-only input.

- [ ] **Step 1: Write the failing test**

Create `lib/content/slug.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/content/slug.test.ts`
Expected: FAIL — cannot find module `./slug`.

- [ ] **Step 3: Write the implementation**

Create `lib/content/slug.ts`:

```ts
const MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie',
  ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
  ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '',
  ю: 'iu', я: 'ia', "'": '', "’": '',
}

function transliterate(input: string): string {
  let out = ''
  for (const ch of input.toLowerCase()) {
    out += ch in MAP ? MAP[ch] : ch
  }
  return out
}

export function slugify(title: string): string {
  const slug = transliterate(title)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'book'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/content/slug.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add lib/content/slug.ts lib/content/slug.test.ts
git commit -m "feat: add Ukrainian-aware slugify"
```

---

### Task 5: Book store (read / list / create / update)

**Files:**
- Create: `lib/content/books.ts`
- Test: `lib/content/books.test.ts`

**Interfaces:**
- Consumes: `Book`, `BookMeta` (Task 2); `atomicWrite`, `readFileOr`, `listDirs` (Task 3); `slugify` (Task 4); `gray-matter`.
- Produces:
  - `parseBook(slug: string, raw: string): Book` — parses frontmatter into a validated `Book`; sets `malformed: true` and fills safe defaults when required fields (`title`, `author`) are missing or types are wrong.
  - `serializeBook(book: Book): string` — frontmatter + body string.
  - `readBook(slug: string): Promise<Book | null>`
  - `listBooks(): Promise<Book[]>` — sorted by title.
  - `createBook(meta: BookMeta, body?: string, desiredSlug?: string): Promise<string>` — resolves a unique slug (from `desiredSlug` or `slugify(meta.title)`, suffixing `-2`, `-3`… on collision), writes `book.md`, returns the slug.
  - `updateBook(slug: string, meta: BookMeta, body: string): Promise<void>`

- [ ] **Step 1: Write the failing test**

Create `lib/content/books.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { parseBook, serializeBook, readBook, listBooks, createBook, updateBook } from './books'
import type { BookMeta } from './types'

let dir: string
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bs-books-'))
  process.env.BOOKSHELF_CONTENT_DIR = dir
})
afterEach(async () => {
  delete process.env.BOOKSHELF_CONTENT_DIR
  await fs.rm(dir, { recursive: true, force: true })
})

const meta: BookMeta = {
  title: 'Atomic Habits',
  author: 'James Clear',
  status: 'finished',
  rating: 9,
  tags: ['nonfiction', 'psychology'],
  summary: 'Short summary',
}

describe('parseBook', () => {
  it('parses a valid book', () => {
    const raw = serializeBook({ slug: 'x', body: 'Body', malformed: false, ...meta })
    const book = parseBook('x', raw)
    expect(book.title).toBe('Atomic Habits')
    expect(book.tags).toEqual(['nonfiction', 'psychology'])
    expect(book.body).toBe('Body')
    expect(book.malformed).toBe(false)
  })

  it('marks malformed when required fields missing', () => {
    const book = parseBook('x', '---\nrating: 9\n---\nbody')
    expect(book.malformed).toBe(true)
    expect(book.title).toBe('x') // falls back to slug
    expect(book.tags).toEqual([])
    expect(book.status).toBe('toread')
  })
})

describe('round-trip', () => {
  it('serializes then parses to the same data', () => {
    const original = { slug: 'x', body: 'Body text', malformed: false, ...meta }
    expect(parseBook('x', serializeBook(original))).toEqual(original)
  })
})

describe('store', () => {
  it('createBook writes and returns a slug', async () => {
    const slug = await createBook(meta, 'Body')
    expect(slug).toBe('atomic-habits')
    const book = await readBook(slug)
    expect(book?.title).toBe('Atomic Habits')
    expect(book?.body).toBe('Body')
  })

  it('createBook avoids slug collisions', async () => {
    const a = await createBook(meta)
    const b = await createBook(meta)
    expect(a).toBe('atomic-habits')
    expect(b).toBe('atomic-habits-2')
  })

  it('readBook returns null when missing', async () => {
    expect(await readBook('nope')).toBeNull()
  })

  it('listBooks returns books sorted by title', async () => {
    await createBook({ ...meta, title: 'Zebra' })
    await createBook({ ...meta, title: 'Apple' })
    const books = await listBooks()
    expect(books.map((b) => b.title)).toEqual(['Apple', 'Zebra'])
  })

  it('updateBook overwrites metadata and body', async () => {
    const slug = await createBook(meta, 'Body')
    await updateBook(slug, { ...meta, rating: 5 }, 'New body')
    const book = await readBook(slug)
    expect(book?.rating).toBe(5)
    expect(book?.body).toBe('New body')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/content/books.test.ts`
Expected: FAIL — cannot find module `./books`.

- [ ] **Step 3: Write the implementation**

Create `lib/content/books.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/content/books.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add lib/content/books.ts lib/content/books.test.ts
git commit -m "feat: add book store with frontmatter parsing and unique slugs"
```

---

### Task 6: Note store (read / list / save / delete)

**Files:**
- Create: `lib/content/notes.ts`
- Test: `lib/content/notes.test.ts`

**Interfaces:**
- Consumes: `Note`, `NoteColor` (Task 2); `DEFAULT_NOTE_COLOR`, `isNoteColor` (Task 2 colors); fs utils (Task 3); `gray-matter`.
- Produces:
  - `parseNote(id: string, raw: string): Note`
  - `serializeNote(note: Note): string`
  - `listNotes(slug: string): Promise<Note[]>` — sorted by id.
  - `readNote(slug: string, id: string): Promise<Note | null>`
  - `saveNote(slug: string, note: Note): Promise<void>` — create or overwrite by id.
  - `deleteNote(slug: string, id: string): Promise<void>`
  - `newNoteId(): string` — returns `n-` + 6 random base36 chars. (Not unit-tested for randomness.)

- [ ] **Step 1: Write the failing test**

Create `lib/content/notes.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/content/notes.test.ts`
Expected: FAIL — cannot find module `./notes`.

- [ ] **Step 3: Write the implementation**

Create `lib/content/notes.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/content/notes.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add lib/content/notes.ts lib/content/notes.test.ts
git commit -m "feat: add note store with color/link validation"
```

---

### Task 7: Link parsing + backlink index

**Files:**
- Create: `lib/content/links.ts`
- Test: `lib/content/links.test.ts`

**Interfaces:**
- Consumes: `Book`, `Note` (Task 2).
- Produces:
  - `ParsedLink = { type: 'book'; slug: string } | { type: 'note'; slug: string; noteId: string }`
  - `parseLink(s: string): ParsedLink | null` — parses `book:<slug>` / `note:<slug>/<id>`; returns null if malformed.
  - `linkKey(l: ParsedLink): string` — canonical key (`book:slug` or `note:slug/id`).
  - `linkHref(l: ParsedLink): string` — `/book/<slug>` or `/book/<slug>#<id>`.
  - `Backlink = { fromBook: string; fromNote: string | null }`
  - `buildBacklinkIndex(books: Book[], notesByBook: Record<string, Note[]>): Map<string, Backlink[]>` — maps target key → list of sources.
  - `isBrokenLink(l: ParsedLink, known: { bookSlugs: Set<string>; noteKeys: Set<string> }): boolean`

- [ ] **Step 1: Write the failing test**

Create `lib/content/links.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { parseLink, linkKey, linkHref, buildBacklinkIndex, isBrokenLink } from './links'
import type { Book, Note } from './types'

describe('parseLink', () => {
  it('parses book links', () => {
    expect(parseLink('book:deep-work')).toEqual({ type: 'book', slug: 'deep-work' })
  })
  it('parses note links', () => {
    expect(parseLink('note:deep-work/n-x9')).toEqual({ type: 'note', slug: 'deep-work', noteId: 'n-x9' })
  })
  it('returns null for garbage', () => {
    expect(parseLink('nonsense')).toBeNull()
    expect(parseLink('note:deep-work')).toBeNull()
  })
})

describe('linkKey / linkHref', () => {
  it('builds keys', () => {
    expect(linkKey({ type: 'book', slug: 'a' })).toBe('book:a')
    expect(linkKey({ type: 'note', slug: 'a', noteId: 'n-1' })).toBe('note:a/n-1')
  })
  it('builds hrefs', () => {
    expect(linkHref({ type: 'book', slug: 'a' })).toBe('/book/a')
    expect(linkHref({ type: 'note', slug: 'a', noteId: 'n-1' })).toBe('/book/a#n-1')
  })
})

describe('buildBacklinkIndex', () => {
  it('indexes who links to each target', () => {
    const books: Book[] = [
      { slug: 'a', title: 'A', author: '', status: 'read', tags: [], body: '', malformed: false },
      { slug: 'b', title: 'B', author: '', status: 'read', tags: [], body: '', malformed: false },
    ]
    const notesByBook: Record<string, Note[]> = {
      a: [{ id: 'n-1', color: 'yellow', links: ['book:b'], body: '' }],
      b: [{ id: 'n-9', color: 'yellow', links: ['note:a/n-1'], body: '' }],
    }
    const index = buildBacklinkIndex(books, notesByBook)
    expect(index.get('book:b')).toEqual([{ fromBook: 'a', fromNote: 'n-1' }])
    expect(index.get('note:a/n-1')).toEqual([{ fromBook: 'b', fromNote: 'n-9' }])
  })
})

describe('isBrokenLink', () => {
  const known = { bookSlugs: new Set(['a']), noteKeys: new Set(['note:a/n-1']) }
  it('detects valid and broken links', () => {
    expect(isBrokenLink({ type: 'book', slug: 'a' }, known)).toBe(false)
    expect(isBrokenLink({ type: 'book', slug: 'zzz' }, known)).toBe(true)
    expect(isBrokenLink({ type: 'note', slug: 'a', noteId: 'n-1' }, known)).toBe(false)
    expect(isBrokenLink({ type: 'note', slug: 'a', noteId: 'n-9' }, known)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/content/links.test.ts`
Expected: FAIL — cannot find module `./links`.

- [ ] **Step 3: Write the implementation**

Create `lib/content/links.ts`:

```ts
import type { Book, Note } from './types'

export type ParsedLink =
  | { type: 'book'; slug: string }
  | { type: 'note'; slug: string; noteId: string }

export interface Backlink {
  fromBook: string
  fromNote: string | null
}

export function parseLink(s: string): ParsedLink | null {
  const book = /^book:([^/\s]+)$/.exec(s)
  if (book) return { type: 'book', slug: book[1] }
  const note = /^note:([^/\s]+)\/([^/\s]+)$/.exec(s)
  if (note) return { type: 'note', slug: note[1], noteId: note[2] }
  return null
}

export function linkKey(l: ParsedLink): string {
  return l.type === 'book' ? `book:${l.slug}` : `note:${l.slug}/${l.noteId}`
}

export function linkHref(l: ParsedLink): string {
  return l.type === 'book' ? `/book/${l.slug}` : `/book/${l.slug}#${l.noteId}`
}

export function buildBacklinkIndex(
  books: Book[],
  notesByBook: Record<string, Note[]>,
): Map<string, Backlink[]> {
  const index = new Map<string, Backlink[]>()
  const add = (target: string, source: Backlink) => {
    const list = index.get(target) ?? []
    list.push(source)
    index.set(target, list)
  }
  for (const book of books) {
    for (const note of notesByBook[book.slug] ?? []) {
      for (const raw of note.links) {
        const parsed = parseLink(raw)
        if (parsed) add(linkKey(parsed), { fromBook: book.slug, fromNote: note.id })
      }
    }
  }
  return index
}

export function isBrokenLink(
  l: ParsedLink,
  known: { bookSlugs: Set<string>; noteKeys: Set<string> },
): boolean {
  return l.type === 'book' ? !known.bookSlugs.has(l.slug) : !known.noteKeys.has(linkKey(l))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/content/links.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add lib/content/links.ts lib/content/links.test.ts
git commit -m "feat: add link parsing and backlink index"
```

---

### Task 8: Markdown rendering + wiki-links

**Files:**
- Create: `lib/markdown.ts`
- Test: `lib/markdown.test.ts`

**Interfaces:**
- Consumes: `parseLink`, `linkHref` (Task 7); `remark`, `remark-html`.
- Produces: `renderMarkdown(md: string): Promise<string>` — converts `[[book:slug]]` / `[[note:slug/id]]` wiki-links to markdown links (label = the link target's slug or `slug/id`, href via `linkHref`) **before** rendering, then renders to HTML.

- [ ] **Step 1: Write the failing test**

Create `lib/markdown.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('renders basic markdown', async () => {
    const html = await renderMarkdown('# Title\n\nSome **bold** text.')
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<strong>bold</strong>')
  })

  it('converts a book wiki-link', async () => {
    const html = await renderMarkdown('See [[book:deep-work]] for more.')
    expect(html).toContain('<a href="/book/deep-work">deep-work</a>')
  })

  it('converts a note wiki-link', async () => {
    const html = await renderMarkdown('Compare [[note:deep-work/n-x9]].')
    expect(html).toContain('<a href="/book/deep-work#n-x9">deep-work/n-x9</a>')
  })

  it('leaves malformed wiki-links as text', async () => {
    const html = await renderMarkdown('Broken [[nonsense]] here.')
    expect(html).toContain('[[nonsense]]')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/markdown.test.ts`
Expected: FAIL — cannot find module `./markdown`.

- [ ] **Step 3: Write the implementation**

Create `lib/markdown.ts`:

```ts
import { remark } from 'remark'
import html from 'remark-html'
import { parseLink, linkHref } from './content/links'

function expandWikiLinks(md: string): string {
  return md.replace(/\[\[([^\]]+)\]\]/g, (whole, inner: string) => {
    const parsed = parseLink(inner.trim())
    if (!parsed) return whole
    const label = parsed.type === 'book' ? parsed.slug : `${parsed.slug}/${parsed.noteId}`
    return `[${label}](${linkHref(parsed)})`
  })
}

export async function renderMarkdown(md: string): Promise<string> {
  const expanded = expandWikiLinks(md)
  const file = await remark().use(html).process(expanded)
  return String(file)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/markdown.test.ts`
Expected: PASS, all tests.

- [ ] **Step 5: Commit**

```bash
git add lib/markdown.ts lib/markdown.test.ts
git commit -m "feat: add markdown rendering with wiki-link expansion"
```

---


### Task 9: Integrate the design system (vendor components + tokens) [C10]

**Files:**
- Create (copied): `components/ds/**` (DS components), `app/design-system/styles.css` + `app/design-system/tokens/**`
- Modify: `app/layout.tsx`, `app/globals.css`
- Test: `components/ds/ds-smoke.test.tsx`

**Interfaces:**
- Consumes: `docs/design-system/` (source).
- Produces: vendored DS components importable from `@/components/ds/<group>/<Name>`, and DS tokens/styles loaded globally. DS components are marked `'use client'` (they attach event handlers).

> **Decision (C10):** vendor (copy) the DS source into the app rather than import from `docs/`. This decouples the build from `docs/` and lets us add Next adaptations (`'use client'`). `docs/design-system/` stays the source of truth; re-run this copy when it changes.

- [ ] **Step 1: Copy DS styles + tokens into the app**

```bash
mkdir -p app/design-system
cp docs/design-system/styles.css app/design-system/styles.css
cp -R docs/design-system/tokens app/design-system/tokens
```

- [ ] **Step 2: Copy DS components and mark them client components**

```bash
mkdir -p components/ds
cp -R docs/design-system/components/. components/ds/
# DS components use onClick/onChange — Next needs them as client components.
find components/ds -name '*.jsx' | while read -r f; do
  printf "'use client';\n%s" "$(cat "$f")" > "$f.tmp" && mv "$f.tmp" "$f"
done
```

- [ ] **Step 3: Load DS styles + set language in the root layout**

Replace `app/layout.tsx` with:

```tsx
import type { Metadata } from 'next'
import './design-system/styles.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bookshelf',
  description: 'Your reading notes.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

Then empty out the scaffold's `app/globals.css` (DS `base.css` already provides resets) — leave only app-specific overrides:

```css
/* App-specific layout helpers (DS tokens/resets come from design-system/styles.css) */
main { max-width: var(--container-max); margin: 0 auto; padding: var(--space-8) var(--space-6); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-5); }
.reading-column { max-width: var(--reading-max); }
```

- [ ] **Step 4: Write a DS smoke test**

Create `components/ds/ds-smoke.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './core/Button'

describe('design system vendoring', () => {
  it('renders a DS Button with its class and label', () => {
    render(<Button>Add book</Button>)
    const btn = screen.getByRole('button', { name: 'Add book' })
    expect(btn).toHaveClass('bs-button')
  })
})
```

- [ ] **Step 5: Run the smoke test**

Run: `npm test -- components/ds/ds-smoke.test.tsx`
Expected: PASS.

- [ ] **Step 6: Manually verify styling loads**

Run: `npm run dev`, open `http://localhost:3000`. The scaffold page should now render in the warm-paper theme (cream background, Hanken Grotesk body) — confirming tokens/fonts load. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add components/ds app/design-system app/layout.tsx app/globals.css components/ds/ds-smoke.test.tsx
git commit -m "feat: vendor design system components and tokens"
```

---

### Task 10: Index / shelf page [C11]

**Files:**
- Create: `lib/content/queries.ts`, `components/BookCardLink.tsx`, `components/TagShelf.tsx`
- Modify: `app/page.tsx`
- Test: `lib/content/queries.test.ts`, `components/shelf.test.tsx`

**Interfaces:**
- Consumes: `listBooks` (Task 5); `Book` (Task 2); DS `BookCard` (Task 9).
- Produces:
  - `groupBooksByTag(books: Book[]): { tag: string; books: Book[] }[]` — one group per distinct tag (alphabetical); a multi-tag book appears in several groups; untagged books group under `'Untagged'`.
  - `BookCardLink({ book }: { book: Book })` — wraps DS `BookCard` in a `next/link` to `/book/<slug>`, mapping cover/coverColor/status/rating.
  - `TagShelf({ tag, books }: { tag: string; books: Book[] })`.

- [ ] **Step 1: Write the failing queries test**

Create `lib/content/queries.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/content/queries.test.ts`
Expected: FAIL — cannot find module `./queries`.

- [ ] **Step 3: Write the queries implementation**

Create `lib/content/queries.ts`:

```ts
import type { Book } from './types'

const UNTAGGED = 'Untagged'

export function groupBooksByTag(books: Book[]): { tag: string; books: Book[] }[] {
  const byTag = new Map<string, Book[]>()
  for (const book of books) {
    const tags = book.tags.length > 0 ? book.tags : [UNTAGGED]
    for (const tag of tags) {
      const list = byTag.get(tag) ?? []
      list.push(book)
      byTag.set(tag, list)
    }
  }
  return [...byTag.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tag, books]) => ({ tag, books }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/content/queries.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing shelf-component test**

Create `components/shelf.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BookCardLink } from './BookCardLink'
import { TagShelf } from './TagShelf'
import type { Book } from '@/lib/content/types'

const book: Book = {
  slug: 'atomic-habits', title: 'Atomic Habits', author: 'James Clear',
  status: 'finished', rating: 9, coverColor: 'blue', tags: ['nonfiction'], body: '', malformed: false,
}

describe('BookCardLink', () => {
  it('links to the book page and shows title + author', () => {
    render(<BookCardLink book={book} />)
    const link = screen.getByRole('link', { name: /Atomic Habits/ })
    expect(link).toHaveAttribute('href', '/book/atomic-habits')
    expect(screen.getByText('James Clear')).toBeInTheDocument()
  })
})

describe('TagShelf', () => {
  it('renders the tag heading and a card per book', () => {
    render(<TagShelf tag="nonfiction" books={[book]} />)
    expect(screen.getByRole('heading', { name: 'nonfiction' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Atomic Habits/ })).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- components/shelf.test.tsx`
Expected: FAIL — cannot find module `./BookCardLink`.

- [ ] **Step 7: Write the components**

Create `components/BookCardLink.tsx`:

```tsx
import Link from 'next/link'
import { BookCard } from '@/components/ds/book/BookCard'
import type { Book } from '@/lib/content/types'

export function BookCardLink({ book }: { book: Book }) {
  return (
    <Link href={`/book/${book.slug}`} style={{ textDecoration: 'none' }}>
      <BookCard
        title={book.title}
        author={book.author}
        rating={book.rating}
        status={book.status}
        tags={book.tags}
        cover={book.coverColor ?? 'ink'}
        coverSrc={book.cover ? `/book/${book.slug}/${book.cover}` : undefined}
        style={{ width: '100%' }}
      />
    </Link>
  )
}
```

Create `components/TagShelf.tsx`:

```tsx
import type { Book } from '@/lib/content/types'
import { BookCardLink } from './BookCardLink'

export function TagShelf({ tag, books }: { tag: string; books: Book[] }) {
  return (
    <section style={{ marginBottom: 'var(--space-12)' }}>
      <h2 style={{ marginBottom: 'var(--space-4)' }}>{tag}</h2>
      <div className="grid">
        {books.map((b) => (
          <BookCardLink key={b.slug} book={b} />
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- components/shelf.test.tsx`
Expected: PASS, both suites.

- [ ] **Step 9: Write the index page**

Replace `app/page.tsx`:

```tsx
import Link from 'next/link'
import { listBooks } from '@/lib/content/books'
import { groupBooksByTag } from '@/lib/content/queries'
import { TagShelf } from '@/components/TagShelf'
import { Button } from '@/components/ds/core/Button'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const books = await listBooks()
  const groups = groupBooksByTag(books)

  return (
    <main>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
        <h1>The shelf</h1>
        <Link href="/book/new" style={{ textDecoration: 'none' }}><Button>Add book</Button></Link>
      </header>
      {books.length === 0 ? (
        <p>No books yet — <Link href="/book/new">add your first.</Link></p>
      ) : (
        groups.map((g) => <TagShelf key={g.tag} tag={g.tag} books={g.books} />)
      )}
    </main>
  )
}
```

- [ ] **Step 10: Manually verify**

Run: `npm run dev`. Create a sample book:

```bash
mkdir -p content/books/sample
printf -- '---\ntitle: Sample Book\nauthor: Test Author\nstatus: finished\nrating: 8\ncoverColor: coral\ntags:\n  - nonfiction\n---\nSummary body\n' > content/books/sample/book.md
```

Open `http://localhost:3000`: a "nonfiction" shelf with a coral-cover "Sample Book" card showing "Test Author", "8/10", and a "Finished" badge. Stop the dev server.

- [ ] **Step 11: Commit**

```bash
git add lib/content/queries.ts lib/content/queries.test.ts components/BookCardLink.tsx components/TagShelf.tsx components/shelf.test.tsx app/page.tsx
git commit -m "feat: add tag-grouped shelf index using DS BookCard"
```

---

### Task 11: Book page with notes + backlinks [C12]

**Files:**
- Create: `lib/content/index-data.ts`, `components/NoteCardView.tsx`, `components/Backlinks.tsx`, `app/book/[slug]/page.tsx`
- Test: `lib/content/index-data.test.ts`, `components/note-view.test.tsx`

**Interfaces:**
- Consumes: `readBook`, `listBooks` (Task 5); `listNotes` (Task 6); `buildBacklinkIndex`, `Backlink`, `parseLink`, `linkHref` (Task 7); `renderMarkdown` (Task 8); DS `NoteCard`, `Rating` (Task 9).
- Produces:
  - `loadBacklinkIndex(): Promise<Map<string, Backlink[]>>`.
  - `NoteCardView({ note }: { note: Note })` — renders DS `NoteCard` (color/excerpt/reflection/page/links count) plus a clickable list of its resolved outbound links. Anchor id = note id.
  - `Backlinks({ items }: { items: Backlink[] })` — "Linked from" block.

- [ ] **Step 1: Write the failing index-data test**

Create `lib/content/index-data.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/content/index-data.test.ts`
Expected: FAIL — cannot find module `./index-data`.

- [ ] **Step 3: Write the loaders**

Create `lib/content/index-data.ts`:

```ts
import { listBooks } from './books'
import { listNotes } from './notes'
import { buildBacklinkIndex, type Backlink } from './links'
import type { Note } from './types'

export async function loadBacklinkIndex(): Promise<Map<string, Backlink[]>> {
  const books = await listBooks()
  const notesByBook: Record<string, Note[]> = {}
  await Promise.all(
    books.map(async (b) => {
      notesByBook[b.slug] = await listNotes(b.slug)
    }),
  )
  return buildBacklinkIndex(books, notesByBook)
}

export async function loadLinkTargets(): Promise<{ value: string; label: string }[]> {
  const books = await listBooks()
  const targets: { value: string; label: string }[] = []
  for (const book of books) {
    targets.push({ value: `book:${book.slug}`, label: `📕 ${book.title}` })
    const notes = await listNotes(book.slug)
    for (const note of notes) {
      const preview = (note.excerpt ?? note.body).slice(0, 40).replace(/\n/g, ' ')
      targets.push({ value: `note:${book.slug}/${note.id}`, label: `↳ ${book.title}: ${preview || note.id}` })
    }
  }
  return targets
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lib/content/index-data.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing note-view test**

Create `components/note-view.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NoteCardView } from './NoteCardView'
import type { Note } from '@/lib/content/types'

describe('NoteCardView', () => {
  it('renders excerpt, reflection, and clickable outbound links', () => {
    const note: Note = {
      id: 'n-1', color: 'green', excerpt: 'A quoted line', page: 88,
      links: ['book:deep-work', 'note:deep-work/n-9'], body: 'My reflection',
    }
    render(<NoteCardView note={note} />)
    expect(screen.getByText('A quoted line')).toBeInTheDocument()
    expect(screen.getByText('My reflection')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'deep-work' })).toHaveAttribute('href', '/book/deep-work')
    expect(screen.getByRole('link', { name: 'deep-work/n-9' })).toHaveAttribute('href', '/book/deep-work#n-9')
  })
})
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm test -- components/note-view.test.tsx`
Expected: FAIL — cannot find module `./NoteCardView`.

- [ ] **Step 7: Write the components**

Create `components/NoteCardView.tsx`:

```tsx
import { NoteCard } from '@/components/ds/book/NoteCard'
import { parseLink, linkHref } from '@/lib/content/links'
import type { Note } from '@/lib/content/types'

export function NoteCardView({ note }: { note: Note }) {
  const links = note.links.map((raw) => parseLink(raw)).filter((l) => l !== null)
  return (
    <div id={note.id} style={{ marginBottom: 'var(--space-4)' }}>
      <NoteCard
        color={note.color}
        excerpt={note.excerpt}
        note={note.body || undefined}
        page={note.page}
        links={links.length}
      />
      {links.length > 0 && (
        <ul style={{ margin: 'var(--space-2) 0 0', paddingLeft: 'var(--space-5)', fontSize: 'var(--text-sm)' }}>
          {links.map((l) => (
            <li key={linkHref(l!)}>
              <a href={linkHref(l!)}>{l!.type === 'book' ? l!.slug : `${l!.slug}/${l!.noteId}`}</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

Create `components/Backlinks.tsx`:

```tsx
import type { Backlink } from '@/lib/content/links'

export function Backlinks({ items }: { items: Backlink[] }) {
  if (items.length === 0) return null
  return (
    <section style={{ marginTop: 'var(--space-12)', borderTop: '1px solid var(--border-default)', paddingTop: 'var(--space-4)' }}>
      <h2>Linked from</h2>
      <ul>
        {items.map((b, i) => {
          const href = b.fromNote ? `/book/${b.fromBook}#${b.fromNote}` : `/book/${b.fromBook}`
          const label = b.fromNote ? `${b.fromBook} / ${b.fromNote}` : b.fromBook
          return <li key={i}><a href={href}>{label}</a></li>
        })}
      </ul>
    </section>
  )
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `npm test -- components/note-view.test.tsx`
Expected: PASS.

- [ ] **Step 9: Write the book page**

Create `app/book/[slug]/page.tsx`:

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { readBook } from '@/lib/content/books'
import { listNotes } from '@/lib/content/notes'
import { loadBacklinkIndex } from '@/lib/content/index-data'
import { renderMarkdown } from '@/lib/markdown'
import { Rating } from '@/components/ds/book/Rating'
import { Button } from '@/components/ds/core/Button'
import { NoteCardView } from '@/components/NoteCardView'
import { Backlinks } from '@/components/Backlinks'

export const dynamic = 'force-dynamic'

const STATUS_LABEL = { reading: 'Reading', finished: 'Finished', toread: 'To read' }

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const book = await readBook(slug)
  if (!book) notFound()

  const notes = await listNotes(slug)
  const summaryHtml = book.summary ? await renderMarkdown(book.summary) : ''
  const backlinkIndex = await loadBacklinkIndex()

  return (
    <main>
      <p><Link href="/">← The shelf</Link></p>
      {book.malformed && <p style={{ color: 'var(--danger)' }}>This book's metadata needs attention.</p>}

      <header style={{ display: 'flex', gap: 'var(--space-6)', alignItems: 'flex-start' }}>
        {book.cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/book/${slug}/${book.cover}`} alt="" style={{ width: 140, borderRadius: 'var(--radius-sm)' }} />
        )}
        <div>
          <h1>{book.title}</h1>
          <p style={{ color: 'var(--text-muted)' }}>{book.author}</p>
          {book.rating != null && <Rating value={book.rating} readOnly size="sm" />}
          <p>Status: {STATUS_LABEL[book.status]}{book.dateRead ? ` · ${book.dateRead}` : ''}</p>
          <p style={{ fontFamily: 'var(--font-meta)', color: 'var(--text-muted)' }}>
            {book.tags.map((t) => `#${t}`).join(' ') || '—'}
          </p>
          <Link href={`/book/${slug}/edit`} style={{ textDecoration: 'none' }}><Button variant="secondary" size="sm">Edit</Button></Link>
        </div>
      </header>

      {summaryHtml && (
        <section className="reading-column" style={{ marginTop: 'var(--space-8)' }}>
          <h2>Summary</h2>
          <div dangerouslySetInnerHTML={{ __html: summaryHtml }} />
        </section>
      )}

      <section className="reading-column" style={{ marginTop: 'var(--space-8)' }}>
        <h2>Notes</h2>
        {notes.length === 0 && <p>No notes yet — highlight your first passage.</p>}
        {notes.map((n) => <NoteCardView key={n.id} note={n} />)}
        <p style={{ marginTop: 'var(--space-4)' }}>
          <Link href={`/book/${slug}/notes/new`} style={{ textDecoration: 'none' }}><Button size="sm">Add note</Button></Link>
        </p>
      </section>

      <Backlinks items={backlinkIndex.get(`book:${slug}`) ?? []} />
    </main>
  )
}
```

- [ ] **Step 10: Manually verify**

Run: `npm run dev`, open `http://localhost:3000/book/sample`. Expected: title (serif), author, "8/10" rating, "Finished" status, summary, "No notes yet…", and Edit / Add note buttons. `/book/missing` → 404. Stop the dev server.

- [ ] **Step 11: Commit**

```bash
git add lib/content/index-data.ts lib/content/index-data.test.ts components/NoteCardView.tsx components/note-view.test.tsx components/Backlinks.tsx "app/book/[slug]/page.tsx"
git commit -m "feat: add book page with DS note cards and backlinks"
```

---

### Task 12: Server actions + cover route [C9 / C15]

**Files:**
- Create: `app/actions.ts`, `app/book/[slug]/[...cover]/route.ts`
- Modify: `lib/content/fs-utils.ts` (add `atomicWriteBuffer`)
- Test: `app/actions.test.ts`

**Interfaces:**
- Consumes: `createBook`, `updateBook` (Task 5); `saveNote`, `deleteNote` (Task 6); `BookMeta`, `BookStatus`, `CoverColor`, `Note` (Task 2); `isNoteColor`, `DEFAULT_NOTE_COLOR` (Task 2); `bookDir` (Task 2).
- Produces (`'use server'`): `createBookAction`, `updateBookAction`, `saveNoteAction`, `deleteNoteAction` (each takes `FormData`, calls `revalidatePath` + `redirect`); pure exported parsers `bookMetaFromForm`, `noteFromForm`; a cover-serving route handler.

- [ ] **Step 1: Write the failing parser test**

Create `app/actions.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { bookMetaFromForm, noteFromForm } from './actions'

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- app/actions.test.ts`
Expected: FAIL — cannot find module `./actions`.

- [ ] **Step 3: Add a binary-safe atomic write**

Add to `lib/content/fs-utils.ts`:

```ts
export async function atomicWriteBuffer(filePath: string, data: Buffer): Promise<void> {
  const dir = path.dirname(filePath)
  await fs.mkdir(dir, { recursive: true })
  const tmp = path.join(dir, `.${path.basename(filePath)}.tmp-${process.pid}`)
  await fs.writeFile(tmp, data)
  await fs.rename(tmp, filePath)
}
```

- [ ] **Step 4: Write the actions**

Create `app/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import path from 'node:path'
import type { BookMeta, BookStatus, CoverColor, Note } from '@/lib/content/types'
import { createBook, updateBook } from '@/lib/content/books'
import { saveNote, deleteNote } from '@/lib/content/notes'
import { isNoteColor, DEFAULT_NOTE_COLOR } from '@/lib/content/colors'
import { atomicWriteBuffer } from '@/lib/content/fs-utils'
import { bookDir } from '@/lib/content/paths'

const STATUSES: BookStatus[] = ['reading', 'finished', 'toread']
const COVER_COLORS: CoverColor[] = ['blue', 'coral', 'teal', 'purple', 'amber', 'green', 'ink']

function str(fd: FormData, key: string): string {
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

async function saveCover(slug: string, fd: FormData): Promise<string | undefined> {
  const file = fd.get('cover')
  if (!(file instanceof File) || file.size === 0) return undefined
  const ext = path.extname(file.name) || '.img'
  const filename = `cover${ext}`
  await atomicWriteBuffer(path.join(bookDir(slug), filename), Buffer.from(await file.arrayBuffer()))
  return filename
}

export async function createBookAction(fd: FormData): Promise<void> {
  const meta = bookMetaFromForm(fd)
  const slug = await createBook(meta, '', str(fd, 'slug') || undefined)
  const cover = await saveCover(slug, fd)
  if (cover) await updateBook(slug, { ...meta, cover }, '')
  revalidatePath('/')
  redirect(`/book/${slug}`)
}

export async function updateBookAction(fd: FormData): Promise<void> {
  const slug = str(fd, 'slug')
  const meta = bookMetaFromForm(fd)
  const cover = (await saveCover(slug, fd)) ?? (str(fd, 'existingCover') || undefined)
  await updateBook(slug, { ...meta, cover }, str(fd, 'body'))
  revalidatePath('/')
  revalidatePath(`/book/${slug}`)
  redirect(`/book/${slug}`)
}

export async function saveNoteAction(fd: FormData): Promise<void> {
  const { slug, note } = noteFromForm(fd)
  await saveNote(slug, note)
  revalidatePath(`/book/${slug}`)
  redirect(`/book/${slug}#${note.id}`)
}

export async function deleteNoteAction(fd: FormData): Promise<void> {
  const slug = str(fd, 'slug')
  await deleteNote(slug, str(fd, 'id'))
  revalidatePath(`/book/${slug}`)
  redirect(`/book/${slug}`)
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- app/actions.test.ts`
Expected: PASS, all tests.

- [ ] **Step 6: Write the cover-serving route**

Create `app/book/[slug]/[...cover]/route.ts`:

```ts
import { NextRequest } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'
import { bookDir } from '@/lib/content/paths'

const TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp',
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string; cover: string[] }> }) {
  const { slug, cover } = await ctx.params
  const filename = cover.join('/')
  if (filename.includes('..')) return new Response('Bad request', { status: 400 })
  try {
    const data = await fs.readFile(path.join(bookDir(slug), filename))
    const type = TYPES[path.extname(filename).toLowerCase()] ?? 'application/octet-stream'
    return new Response(new Uint8Array(data), { headers: { 'Content-Type': type } })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
```

- [ ] **Step 7: Manually verify cover serving**

Run: `npm run dev`. Put a small JPG at `content/books/sample/cover.jpg` and set `cover: cover.jpg` in its `book.md`. Open `http://localhost:3000/book/sample/cover.jpg` → image loads; `/book/sample` → cover appears. Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add app/actions.ts app/actions.test.ts lib/content/fs-utils.ts "app/book/[slug]/[...cover]/route.ts"
git commit -m "feat: add server actions and cover image route"
```

---

### Task 13: Create / edit book form [C13]

**Files:**
- Create: `components/BookForm.tsx`, `app/book/new/page.tsx`, `app/book/[slug]/edit/page.tsx`
- Test: `components/BookForm.test.tsx`

**Interfaces:**
- Consumes: `Book` (Task 2); `createBookAction`, `updateBookAction` (Task 12); DS `Input`, `Select`, `Textarea`, `Button` (Task 9).
- Produces: `BookForm({ action, book }: { action: (fd: FormData) => void; book?: Book })` — server-rendered form using DS fields; status + coverColor are `Select`s; cover is a file input; `slug` editable only when creating; hidden `slug`/`existingCover` when editing.

- [ ] **Step 1: Write the failing component test**

Create `components/BookForm.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BookForm } from './BookForm'
import type { Book } from '@/lib/content/types'

describe('BookForm', () => {
  it('renders fields and a save button for a new book', () => {
    render(<BookForm action={vi.fn()} />)
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Slug')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })
  it('prefills and hides slug when editing', () => {
    const book: Book = {
      slug: 'atomic-habits', title: 'Atomic Habits', author: 'James Clear',
      status: 'finished', rating: 9, tags: ['nonfiction', 'psychology'], summary: 'S', body: '', malformed: false,
    }
    render(<BookForm action={vi.fn()} book={book} />)
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Atomic Habits')
    expect((screen.getByLabelText('Tags (comma-separated)') as HTMLInputElement).value).toBe('nonfiction, psychology')
    expect(screen.queryByLabelText('Slug')).not.toBeInTheDocument()
  })
})
```

> Note: `getByLabelText` relies on DS `Input`/`Select`/`Textarea` associating their `label` prop with the control. Confirm this when the test first runs; if the DS components render the label without an `htmlFor`/`id` association, add `id`/`aria-label` via the passthrough props in `BookForm`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/BookForm.test.tsx`
Expected: FAIL — cannot find module `./BookForm`.

- [ ] **Step 3: Write the BookForm**

Create `components/BookForm.tsx`:

```tsx
import type { Book } from '@/lib/content/types'
import { Input } from '@/components/ds/core/Input'
import { Select } from '@/components/ds/core/Select'
import { Textarea } from '@/components/ds/core/Textarea'
import { Button } from '@/components/ds/core/Button'

const STATUS_OPTIONS = [
  { value: 'toread', label: 'To read' },
  { value: 'reading', label: 'Reading' },
  { value: 'finished', label: 'Finished' },
]
const COVER_OPTIONS = ['ink', 'blue', 'coral', 'teal', 'purple', 'amber', 'green']

export function BookForm({ action, book }: { action: (fd: FormData) => void; book?: Book }) {
  const editing = Boolean(book)
  return (
    <form action={action} encType="multipart/form-data" style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: 520 }}>
      {editing && <input type="hidden" name="slug" value={book!.slug} />}
      {editing && book!.cover && <input type="hidden" name="existingCover" value={book!.cover} />}

      <Input label="Title" name="title" defaultValue={book?.title ?? ''} required />
      <Input label="Author" name="author" defaultValue={book?.author ?? ''} required />
      {!editing && <Input label="Slug" name="slug" hint="Generated from the title — editable" />}

      <Select label="Status" name="status" defaultValue={book?.status ?? 'toread'} options={STATUS_OPTIONS} />
      <Select label="Cover color" name="coverColor" defaultValue={book?.coverColor ?? 'ink'} options={COVER_OPTIONS} />

      <Input label="Rating (1–10)" name="rating" type="number" min={1} max={10} defaultValue={book?.rating ?? ''} />
      <Input label="Date read" name="dateRead" type="date" defaultValue={book?.dateRead ?? ''} />
      <Input label="Tags (comma-separated)" name="tags" defaultValue={book?.tags.join(', ') ?? ''} />

      <Textarea label="Summary" name="summary" rows={5} ruled defaultValue={book?.summary ?? ''} />
      <Input label="Cover image" name="cover" type="file" accept="image/*" />

      <div><Button type="submit">Save</Button></div>
    </form>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- components/BookForm.test.tsx`
Expected: PASS. (If label association fails, apply the fix noted in Step 1, then re-run.)

- [ ] **Step 5: Write the new-book page**

Create `app/book/new/page.tsx`:

```tsx
import { BookForm } from '@/components/BookForm'
import { createBookAction } from '@/app/actions'

export default function NewBookPage() {
  return (
    <main>
      <h1>Add book</h1>
      <BookForm action={createBookAction} />
    </main>
  )
}
```

- [ ] **Step 6: Write the edit-book page**

Create `app/book/[slug]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { readBook } from '@/lib/content/books'
import { BookForm } from '@/components/BookForm'
import { updateBookAction } from '@/app/actions'

export const dynamic = 'force-dynamic'

export default async function EditBookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const book = await readBook(slug)
  if (!book) notFound()
  return (
    <main>
      <h1>Edit: {book.title}</h1>
      <BookForm action={updateBookAction} book={book} />
    </main>
  )
}
```

- [ ] **Step 7: Manually verify**

Run: `npm run dev`. Go to `/book/new`, fill title/author/tags/rating/status, submit → redirect to the new book page; `content/books/<slug>/book.md` exists. Click Edit, change the rating, submit → book page shows the new rating. Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add components/BookForm.tsx components/BookForm.test.tsx app/book/new "app/book/[slug]/edit"
git commit -m "feat: add create/edit book form using DS fields"
```

---

### Task 14: Note editor with HighlighterPicker + LinkPicker [C14]

**Files:**
- Create: `components/NoteForm.tsx`, `app/book/[slug]/notes/new/page.tsx`, `app/book/[slug]/notes/[noteId]/edit/page.tsx`
- Test: `components/NoteForm.test.tsx`

**Interfaces:**
- Consumes: `Note` (Task 2); DS `HighlighterPicker`, `Input`, `Textarea`, `Button` (Task 9); `HIGHLIGHTER_KEYS`; `saveNoteAction`, `deleteNoteAction` (Task 12); `newNoteId`, `readNote` (Task 6); `loadLinkTargets` (Task 11).
- Produces: `NoteForm` (a `'use client'` component holding the selected color + links state and submitting via the server action). Fields: hidden `slug` + `id`; `HighlighterPicker` → hidden `color`; `excerpt` input; `page` input; reflection `Textarea` (`ruled`); links `Textarea` + a picker that appends a chosen `book:`/`note:` target; submit; delete (when editing).

- [ ] **Step 1: Write the failing component test**

Create `components/NoteForm.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NoteForm } from './NoteForm'
import type { Note } from '@/lib/content/types'

const targets = [
  { value: 'book:deep-work', label: 'Deep Work' },
  { value: 'note:deep-work/n-9', label: 'Deep Work / n-9' },
]

describe('NoteForm', () => {
  it('renders empty reflection + a color swatch row for a new note', () => {
    render(<NoteForm action={vi.fn()} slug="atomic-habits" id="n-new" targets={targets} />)
    expect((screen.getByLabelText('Your note') as HTMLTextAreaElement).value).toBe('')
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })
  it('prefills reflection, excerpt, and links when editing', () => {
    const note: Note = { id: 'n-1', color: 'green', excerpt: 'A quote', page: 88, links: ['book:deep-work'], body: 'Reflection' }
    render(<NoteForm action={vi.fn()} slug="atomic-habits" note={note} targets={targets} />)
    expect((screen.getByLabelText('Your note') as HTMLTextAreaElement).value).toBe('Reflection')
    expect((screen.getByLabelText('Quoted passage') as HTMLTextAreaElement).value).toBe('A quote')
    expect((screen.getByLabelText('Links (one per line)') as HTMLTextAreaElement).value).toBe('book:deep-work')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- components/NoteForm.test.tsx`
Expected: FAIL — cannot find module `./NoteForm`.

- [ ] **Step 3: Write the NoteForm (client component)**

Create `components/NoteForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { Note, HighlighterKey } from '@/lib/content/types'
import { HighlighterPicker } from '@/components/ds/book/HighlighterPicker'
import { Input } from '@/components/ds/core/Input'
import { Textarea } from '@/components/ds/core/Textarea'
import { Button } from '@/components/ds/core/Button'

export function NoteForm({
  action, deleteAction, slug, id, note, targets,
}: {
  action: (fd: FormData) => void
  deleteAction?: (fd: FormData) => void
  slug: string
  id?: string
  note?: Note
  targets: { value: string; label: string }[]
}) {
  const noteId = note?.id ?? id ?? ''
  const [color, setColor] = useState<HighlighterKey>(note?.color ?? 'yellow')
  const [links, setLinks] = useState(note?.links.join('\n') ?? '')
  const [pick, setPick] = useState('')

  function appendLink() {
    if (!pick) return
    setLinks((cur) => (cur.trim() ? `${cur.trim()}\n${pick}` : pick))
    setPick('')
  }

  return (
    <>
      <form action={action} style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: 560 }}>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="id" value={noteId} />
        <input type="hidden" name="color" value={color} />

        <div>
          <label className="bs-eyebrow" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Highlighter</label>
          <HighlighterPicker value={color} onChange={setColor} />
        </div>

        <Textarea label="Quoted passage" name="excerpt" rows={2} ruled defaultValue={note?.excerpt ?? ''} />
        <Textarea label="Your note" name="body" rows={5} ruled defaultValue={note?.body ?? ''} />
        <Input label="Page" name="page" type="number" min={1} defaultValue={note?.page ?? ''} />

        <div>
          <label className="bs-eyebrow" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Link to existing</label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <select value={pick} onChange={(e) => setPick(e.target.value)} className="bs-input" style={{ flex: 1 }}>
              <option value="">— choose a book or note —</option>
              {targets.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <Button type="button" variant="secondary" onClick={appendLink}>Add link</Button>
          </div>
        </div>

        <Textarea label="Links (one per line)" name="links" rows={3} value={links} onChange={(e) => setLinks(e.target.value)} />

        <div><Button type="submit">Save</Button></div>
      </form>

      {note && deleteAction && (
        <form action={deleteAction} style={{ marginTop: 'var(--space-4)' }}>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={note.id} />
          <Button type="submit" variant="danger">Delete note</Button>
        </form>
      )}
    </>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- components/NoteForm.test.tsx`
Expected: PASS. (If label association fails, see the Task 13 Step 1 note.)

- [ ] **Step 5: Write the new-note page**

Create `app/book/[slug]/notes/new/page.tsx`:

```tsx
import { NoteForm } from '@/components/NoteForm'
import { saveNoteAction } from '@/app/actions'
import { newNoteId } from '@/lib/content/notes'
import { loadLinkTargets } from '@/lib/content/index-data'

export const dynamic = 'force-dynamic'

export default async function NewNotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const targets = await loadLinkTargets()
  return (
    <main>
      <h1>Add note</h1>
      <NoteForm action={saveNoteAction} slug={slug} id={newNoteId()} targets={targets} />
    </main>
  )
}
```

- [ ] **Step 6: Write the edit-note page**

Create `app/book/[slug]/notes/[noteId]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { NoteForm } from '@/components/NoteForm'
import { saveNoteAction, deleteNoteAction } from '@/app/actions'
import { readNote } from '@/lib/content/notes'
import { loadLinkTargets } from '@/lib/content/index-data'

export const dynamic = 'force-dynamic'

export default async function EditNotePage({ params }: { params: Promise<{ slug: string; noteId: string }> }) {
  const { slug, noteId } = await params
  const note = await readNote(slug, noteId)
  if (!note) notFound()
  const targets = await loadLinkTargets()
  return (
    <main>
      <h1>Edit note</h1>
      <NoteForm action={saveNoteAction} deleteAction={deleteNoteAction} slug={slug} note={note} targets={targets} />
    </main>
  )
}
```

- [ ] **Step 7: Manually verify the note flow end-to-end**

Run: `npm run dev`. On a book page click "Add note". Pick a highlighter color, write a quoted passage + reflection, set a page, use "Link to existing" to add a link to another book, submit. Expected: redirect to the book page with the new colored note card (spine in the chosen color), the excerpt painted, page shown, and the link listed and clickable. The target book's page shows this note under "Linked from". Edit the note → change color → card spine changes. Delete → the note and its `.md` file disappear. Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add components/NoteForm.tsx components/NoteForm.test.tsx "app/book/[slug]/notes"
git commit -m "feat: add note editor with HighlighterPicker and link picker"
```

---

### Task 15: Final wiring — full test run, build, gitignore, README

**Files:**
- Create: `README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Run the entire test suite**

Run: `npm test`
Expected: PASS — all suites (paths, fs-utils, slug, books, notes, links, markdown, queries, index-data, actions, ds-smoke, shelf, note-view, BookForm, NoteForm).

- [ ] **Step 2: Run a production build**

Run: `npm run build`
Expected: build succeeds, no type errors. Fix any reported type/lint errors before continuing. Common items: ensure DS `.jsx` components are picked up (no missing-types errors — the copied `.d.ts` sit beside them), and that client/server boundaries hold (`NoteForm` is `'use client'`; pages passing server actions are fine).

- [ ] **Step 3: Ignore user content**

Append to `.gitignore`:

```gitignore
# Bookshelf content (user data)
/content
```

- [ ] **Step 4: Write the README**

Create `README.md`:

```markdown
# Bookshelf

A local-first web app for reading notes. Data is stored as Markdown files under
`content/books/<slug>/`. UI is built on the design system in `docs/design-system/`.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
```

## Data

- `content/books/<slug>/book.md` — book metadata (frontmatter) + summary.
- `content/books/<slug>/notes/<note-id>.md` — notes (color, excerpt, page, links, reflection).
- Cover images sit beside `book.md`. Override the data dir with `BOOKSHELF_CONTENT_DIR`.

## Tests

```bash
npm test
```
```

- [ ] **Step 5: Final commit**

```bash
git add README.md .gitignore
git commit -m "docs: add README and gitignore content folder"
```

---

## Plan Self-Review

**Spec coverage** (against `docs/requirements.md`):
- §2 data model (book + note frontmatter, 8 colors, status, coverColor, excerpt/page) → Tasks 2, 5, 6. ✓
- §3.1 shelf grouped by tag, DS `BookCard` → Task 10. ✓
- §3.2 book page, DS `NoteCard`/`Rating`, "Linked from" → Task 11. ✓
- §3.3 create/edit book, cover upload/coverColor, note CRUD, LinkPicker, HighlighterPicker, slug auto+editable → Tasks 12, 13, 14. ✓
- §3.4 link parse + backlink index → Tasks 7, 11. ✓
- §4 English UI/voice, DS visuals → Task 9 + all UI tasks; atomic writes (Task 3); malformed (Task 5); broken links (Task 7); fs isolation (lib/content only). ✓
- §5 capabilities C1–C15 map onto Tasks: C1–C3 (T2,3,4), C4 (T5), C5 (T6), C6 (T7), C7 (T8), C8 (T10/11), C9+C15 (T12), C10 (T9), C11 (T10), C12 (T11), C13 (T13), C14 (T14). ✓
- §6 unit tests with temp dir; component tests for adapters → every task. ✓
- §7 decisions respected (8 colors, rich note, English, status names, slug, no search). ✓

**Known follow-ups (flagged, not silently dropped):**
- Note reflection renders as plain text inside `NoteCard`; markdown/wiki-link rendering *inside* the reflection is deferred. Outbound links are shown as a clickable list beneath the card (satisfies §3.2). Revisit if inline rich reflection is wanted.
- DS form label↔control association is assumed (`getByLabelText`); verified at first test run (Task 13 Step 1 note).
- Lucide icons are out of MVP scope (DS components accept icon nodes where needed); add later if desired.
- Dark mode toggle is not wired (tokens support `data-theme="dark"`); a future small task.

**Placeholder scan:** No TBD/TODO; every code step contains complete code. ✓
**Type consistency:** `Book`/`Note`/`BookMeta`/`HighlighterKey`/`CoverColor`/`BookStatus` consistent across tasks; action parsers return the shapes the stores consume; DS prop usage matches the `.d.ts` contracts read from `docs/design-system/`. ✓
