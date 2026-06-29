import { notFound } from 'next/navigation'
import { readBook } from '@/lib/content/books'
import { BookForm } from '@/components/BookForm'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { updateBookAction } from '@/app/actions'

export const dynamic = 'force-dynamic'

export default async function EditBookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const book = await readBook(slug)
  if (!book) notFound()
  return (
    <main>
      <Breadcrumbs items={[{ label: 'The shelf', href: '/' }, { label: book.title, href: `/book/${slug}` }, { label: 'Edit' }]} />
      <h1>Edit: {book.title}</h1>
      <BookForm action={updateBookAction} book={book} />
    </main>
  )
}
