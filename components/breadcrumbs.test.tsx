// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Breadcrumbs } from './Breadcrumbs'

describe('Breadcrumbs', () => {
  it('links the ancestors and marks the last crumb as current', () => {
    render(
      <Breadcrumbs
        items={[
          { label: 'The shelf', href: '/' },
          { label: 'Dune', href: '/book/dune' },
          { label: 'Add note' },
        ]}
      />,
    )
    expect(screen.getByRole('link', { name: 'The shelf' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Dune' })).toHaveAttribute('href', '/book/dune')
    // last crumb is current, not a link
    expect(screen.queryByRole('link', { name: 'Add note' })).not.toBeInTheDocument()
    expect(screen.getByText('Add note')).toHaveAttribute('aria-current', 'page')
  })
})
