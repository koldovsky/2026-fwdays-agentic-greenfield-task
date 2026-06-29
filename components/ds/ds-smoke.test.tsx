// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from './core/Button'

describe('design system vendoring', () => {
  it('renders a DS Button with its class and label', () => {
    render(<Button>Add book</Button>)
    const btn = screen.getByRole('button', { name: 'Add book' })
    expect(btn).toHaveClass('bs-button')
  })
})
