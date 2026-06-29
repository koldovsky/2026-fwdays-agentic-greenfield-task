// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NoteForm } from './NoteForm'
import type { Note } from '@/lib/content/types'

const targets = [
  { value: 'book:deep-work', label: 'Deep Work' },
  { value: 'note:deep-work/n-9', label: 'Deep Work / n-9' },
]

describe('NoteForm', () => {
  it('renders empty reflection + a color swatch row for a new note', () => {
    render(<NoteForm action={vi.fn()} slug="atomic-habits" id="n-new" targets={targets} />)
    expect((screen.getByLabelText('Your note') as HTMLTextAreaElement).value).toBe('')
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })
  it('shows the highlighter color legend (meanings)', () => {
    render(<NoteForm action={vi.fn()} slug="atomic-habits" id="n-new" targets={targets} />)
    const legend = screen.getByRole('list', { name: 'Highlighter color meanings' })
    expect(legend).toBeInTheDocument()
    expect(screen.getByText('Idea')).toBeInTheDocument()
    expect(screen.getByText('Quote')).toBeInTheDocument()
  })
  it('prefills reflection, excerpt, and links when editing', () => {
    const note: Note = { id: 'n-1', color: 'green', excerpt: 'A quote', page: 88, links: ['book:deep-work'], body: 'Reflection' }
    render(<NoteForm action={vi.fn()} slug="atomic-habits" note={note} targets={targets} />)
    expect((screen.getByLabelText('Your note') as HTMLTextAreaElement).value).toBe('Reflection')
    expect((screen.getByLabelText('Quoted passage') as HTMLTextAreaElement).value).toBe('A quote')
    expect((screen.getByLabelText('Links (one per line)') as HTMLTextAreaElement).value).toBe('book:deep-work')
  })
})
