import Link from 'next/link'
import type { Book } from '@/lib/content/types'
import { coverGradient, spineHeight, spineWidth } from './cover'

export function BookSpine({ book }: { book: Book }) {
  const coverBg = book.cover
    ? `center / cover no-repeat url("${encodeURI(`/book/${book.slug}/${book.cover}`)}")`
    : coverGradient(book.coverColor)

  return (
    <div className="bs-spine-wrap">
      <Link
        href={`/book/${book.slug}`}
        className="bs-spine"
        aria-label={`${book.title} — ${book.author}`}
        title={`${book.title} — ${book.author}`}
        style={{
          height: spineHeight(book.slug),
          width: spineWidth(book.slug),
          background: coverGradient(book.coverColor),
        }}
      >
        <span className="bs-spine__title">{book.title}</span>
        <span className="bs-spine__author">{book.author}</span>
      </Link>

      <div className="bs-preview">
        <div className="bs-preview__cover" style={{ background: coverBg }} />
        <div className="bs-preview__body">
          <div className="bs-preview__title">{book.title}</div>
          <div className="bs-preview__author">{book.author}</div>
          {book.summary && <div className="bs-preview__summary">{book.summary}</div>}
          <div className="bs-preview__actions">
            <Link href={`/book/${book.slug}`}>Open book</Link>
            <Link href={`/book/${book.slug}/notes/new`}>＋ Add note</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
