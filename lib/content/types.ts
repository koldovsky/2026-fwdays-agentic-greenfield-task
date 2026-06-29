export type BookStatus = 'reading' | 'finished' | 'toread'
export type CoverColor = 'blue' | 'coral' | 'teal' | 'purple' | 'amber' | 'green' | 'ink'

// Matches docs/design-system/components/book/HighlighterPicker.d.ts
export type HighlighterKey =
  | 'yellow' | 'amber' | 'coral' | 'pink' | 'purple' | 'blue' | 'teal' | 'green'

export interface BookMeta {
  title: string
  author: string
  cover?: string          // relative image filename inside the book folder
  coverColor?: CoverColor // generated cover when no image
  status: BookStatus
  dateRead?: string       // ISO YYYY-MM-DD
  rating?: number         // integer 1..10
  tags: string[]          // hashtags, lowercase, no spaces
  summary?: string
}

export interface Book extends BookMeta {
  slug: string
  body: string            // extended summary markdown (book.md body)
  malformed: boolean      // true when frontmatter failed validation
}

export interface Note {
  id: string              // e.g. "n-a1b2"
  color: HighlighterKey
  excerpt?: string        // quoted passage
  page?: number           // page reference
  links: string[]         // "book:<slug>" | "note:<slug>/<id>"
  body: string            // markdown — your reflection
}
