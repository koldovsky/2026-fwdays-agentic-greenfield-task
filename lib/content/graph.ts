import { listBooks } from './books'
import { listNotes } from './notes'
import { parseLink } from './links'
import type { CoverColor } from './types'

export interface GraphNode {
  slug: string
  title: string
  coverColor: CoverColor
  degree: number
}
export interface GraphEdge {
  from: string
  to: string
}

/**
 * Build an undirected book-level link graph: an edge connects two books when a note
 * in one links to the other (or to one of its notes). Self-links and links to
 * non-existent books are skipped; only books with at least one edge are returned.
 */
export async function buildGraph(): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const books = await listBooks()
  const known = new Set(books.map((b) => b.slug))
  const edgeKeys = new Set<string>()
  const edges: GraphEdge[] = []
  const degree = new Map<string, number>()

  for (const book of books) {
    const notes = await listNotes(book.slug)
    for (const note of notes) {
      for (const raw of note.links) {
        const parsed = parseLink(raw)
        if (!parsed) continue
        const target = parsed.slug
        if (target === book.slug || !known.has(target)) continue
        const key = book.slug < target ? `${book.slug}|${target}` : `${target}|${book.slug}`
        if (edgeKeys.has(key)) continue
        edgeKeys.add(key)
        edges.push({ from: book.slug, to: target })
        degree.set(book.slug, (degree.get(book.slug) ?? 0) + 1)
        degree.set(target, (degree.get(target) ?? 0) + 1)
      }
    }
  }

  const nodes: GraphNode[] = books
    .filter((b) => degree.has(b.slug))
    .map((b) => ({ slug: b.slug, title: b.title, coverColor: b.coverColor ?? 'ink', degree: degree.get(b.slug) ?? 0 }))

  return { nodes, edges }
}
