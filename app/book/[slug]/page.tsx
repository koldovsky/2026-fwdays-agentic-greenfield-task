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
import { Breadcrumbs } from '@/components/Breadcrumbs'

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
      <Breadcrumbs items={[{ label: 'The shelf', href: '/' }, { label: book.title }]} />
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
