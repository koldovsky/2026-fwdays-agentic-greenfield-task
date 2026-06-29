import { notFound } from 'next/navigation'
import { NoteForm } from '@/components/NoteForm'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { saveNoteAction, deleteNoteAction } from '@/app/actions'
import { readNote } from '@/lib/content/notes'
import { readBook } from '@/lib/content/books'
import { loadLinkTargets } from '@/lib/content/index-data'

export const dynamic = 'force-dynamic'

export default async function EditNotePage({ params }: { params: Promise<{ slug: string; noteId: string }> }) {
  const { slug, noteId } = await params
  const [note, book, targets] = await Promise.all([readNote(slug, noteId), readBook(slug), loadLinkTargets()])
  if (!note) notFound()
  const bookCrumb = book ? { label: book.title, href: `/book/${slug}` } : { label: slug }
  return (
    <main>
      <Breadcrumbs items={[{ label: 'The shelf', href: '/' }, bookCrumb, { label: 'Edit note' }]} />
      <h1>Edit note</h1>
      <NoteForm action={saveNoteAction} deleteAction={deleteNoteAction} slug={slug} note={note} targets={targets} />
    </main>
  )
}
