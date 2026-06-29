import { BookForm } from '@/components/BookForm'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { createBookAction } from '@/app/actions'

export default function NewBookPage() {
  return (
    <main>
      <Breadcrumbs items={[{ label: 'The shelf', href: '/' }, { label: 'Add book' }]} />
      <h1>Add book</h1>
      <BookForm action={createBookAction} />
    </main>
  )
}
