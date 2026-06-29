// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BookSpine } from './BookSpine'
import type { Book } from '@/lib/content/types'

const book: Book = {
  slug: 'sapiens', title: 'Sapiens', author: 'Yuval Noah Harari',
  status: 'finished', rating: 9, coverColor: 'amber', tags: ['history'],
  summary: 'A brief history of humankind.', body: '', malformed: false,
}

describe('BookSpine', () => {
  it('is a link to the book page and shows title + author', () => {
    render(<BookSpine book={book} />)
    expect(screen.getByRole('link', { name: /Sapiens/ })).toHaveAttribute('href', '/book/sapiens')
    expect(screen.getAllByText('Sapiens').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Yuval Noah Harari').length).toBeGreaterThanOrEqual(1)
  })

  it('hover preview offers summary + Add-note and Open-book links', () => {
    render(<BookSpine book={book} />)
    expect(screen.getByText('A brief history of humankind.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add note/ })).toHaveAttribute('href', '/book/sapiens/notes/new')
    expect(screen.getByRole('link', { name: 'Open book' })).toHaveAttribute('href', '/book/sapiens')
  })
})
