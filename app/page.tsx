import Link from 'next/link'
import { listBooks } from '@/lib/content/books'
import { groupBooksByTag } from '@/lib/content/queries'
import { ShelfClient } from '@/components/ShelfClient'
import { Button } from '@/components/ds/core/Button'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const books = await listBooks()
  const shelves = groupBooksByTag(books)

  return (
    <main>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)' }}>
        <h1>The shelf</h1>
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
          <Link href="/graph" style={{ textDecoration: 'none' }}><Button variant="secondary">Graph</Button></Link>
          <Link href="/book/new" style={{ textDecoration: 'none' }}><Button>Add book</Button></Link>
        </div>
      </header>
      {books.length === 0 ? (
        <p>No books yet — <Link href="/book/new">add your first.</Link></p>
      ) : (
        <ShelfClient shelves={shelves} />
      )}
    </main>
  )
}
