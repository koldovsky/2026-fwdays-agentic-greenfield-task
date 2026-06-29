// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BookForm } from './BookForm'
import type { Book } from '@/lib/content/types'

describe('BookForm', () => {
  it('renders fields and a save button for a new book', () => {
    render(<BookForm action={vi.fn()} />)
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Slug')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })
  it('prefills and hides slug when editing', () => {
    const book: Book = {
      slug: 'atomic-habits', title: 'Atomic Habits', author: 'James Clear',
      status: 'finished', rating: 9, tags: ['nonfiction', 'psychology'], summary: 'S', body: '', malformed: false,
    }
    render(<BookForm action={vi.fn()} book={book} />)
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Atomic Habits')
    expect((screen.getByLabelText('Tags (comma-separated)') as HTMLInputElement).value).toBe('nonfiction, psychology')
    expect(screen.queryByLabelText('Slug')).not.toBeInTheDocument()
  })
})
