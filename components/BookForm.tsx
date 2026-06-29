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
    <form action={action} style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: 520 }}>
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
