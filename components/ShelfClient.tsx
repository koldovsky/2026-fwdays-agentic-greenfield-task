import type { Book } from '@/lib/content/types'
import { BookSpine } from './BookSpine'

export function ShelfClient({ shelves }: { shelves: { tag: string; books: Book[] }[] }) {
  return (
    <div className="bs-bookcase">
      {shelves.map(({ tag, books }) => (
        <section className="bs-shelf-row" key={tag}>
          <h2 className="bs-shelf__label">{tag}</h2>
          <div className="bs-shelf">
            {books.map((b) => (
              <BookSpine key={b.slug} book={b} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
