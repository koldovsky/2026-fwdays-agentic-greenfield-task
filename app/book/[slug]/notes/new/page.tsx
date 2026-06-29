import { NoteForm } from '@/components/NoteForm'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { saveNoteAction } from '@/app/actions'
import { newNoteId } from '@/lib/content/notes'
import { readBook } from '@/lib/content/books'
import { loadLinkTargets } from '@/lib/content/index-data'

export const dynamic = 'force-dynamic'

export default async function NewNotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [book, targets] = await Promise.all([readBook(slug), loadLinkTargets()])
  const bookCrumb = book ? { label: book.title, href: `/book/${slug}` } : { label: slug }
  return (
    <main>
      <Breadcrumbs items={[{ label: 'The shelf', href: '/' }, bookCrumb, { label: 'Add note' }]} />
      <h1>Add note</h1>
      <NoteForm action={saveNoteAction} slug={slug} id={newNoteId()} targets={targets} />
    </main>
  )
}
