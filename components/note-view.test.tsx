// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NoteCardView } from './NoteCardView'
import type { Note } from '@/lib/content/types'

describe('NoteCardView', () => {
  it('renders excerpt, reflection, and clickable outbound links', () => {
    const note: Note = {
      id: 'n-1', color: 'green', excerpt: 'A quoted line', page: 88,
      links: ['book:deep-work', 'note:deep-work/n-9'], body: 'My reflection',
    }
    render(<NoteCardView note={note} />)
    expect(screen.getByText('A quoted line')).toBeInTheDocument()
    expect(screen.getByText('My reflection')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'deep-work' })).toHaveAttribute('href', '/book/deep-work')
    expect(screen.getByRole('link', { name: 'deep-work/n-9' })).toHaveAttribute('href', '/book/deep-work#n-9')
  })
})
