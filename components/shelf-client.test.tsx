// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShelfClient } from './ShelfClient'
import type { Book } from '@/lib/content/types'

const book: Book = {
  slug: 'sapiens', title: 'Sapiens', author: 'Yuval Noah Harari',
  status: 'finished', rating: 9, coverColor: 'amber', tags: ['history'],
  summary: 'A brief history of humankind.', body: '', malformed: false,
}

describe('ShelfClient', () => {
  it('renders a tag shelf with each book as a link to its page', () => {
    render(<ShelfClient shelves={[{ tag: 'history', books: [book] }]} />)
    expect(screen.getByRole('heading', { name: 'history' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sapiens/ })).toHaveAttribute('href', '/book/sapiens')
  })
})
