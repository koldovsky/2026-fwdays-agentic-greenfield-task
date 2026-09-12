import { describe, expect, it } from 'vitest'
import { collectNames } from './collect-names'
import type { ParsedTicket } from '../jira-parser'

function ticketWith(overrides: Partial<ParsedTicket>): ParsedTicket {
  return {
    key: 'PROJ-1',
    title: 'Title',
    components: [],
    labels: [],
    description: [],
    comments: [],
    attachments: [],
    ...overrides,
  }
}

describe('collectNames', () => {
  it('collects assignee then reporter then comment authors, in order', () => {
    const ticket = ticketWith({
      assignee: 'Alice',
      reporter: 'Bob',
      comments: [
        { author: 'Carol', body: 'x' },
        { author: 'Dave', body: 'y' },
      ],
    })
    expect(collectNames(ticket)).toEqual(['Alice', 'Bob', 'Carol', 'Dave'])
  })

  it('deduplicates repeated names', () => {
    const ticket = ticketWith({
      assignee: 'Alice',
      reporter: 'Alice',
      comments: [{ author: 'Alice', body: 'x' }],
    })
    expect(collectNames(ticket)).toEqual(['Alice'])
  })

  it('skips missing/unknown authors', () => {
    const ticket = ticketWith({ comments: [{ author: undefined, body: 'x' }] })
    expect(collectNames(ticket)).toEqual([])
  })

  it('returns an empty array when there are no known names', () => {
    expect(collectNames(ticketWith({}))).toEqual([])
  })

  it('collects a person-shaped title when no assignee or reporter is set', () => {
    expect(collectNames(ticketWith({ title: 'Federico Ciner' }))).toEqual(['Federico Ciner'])
  })

  it('ignores a person-shaped title when assignee or reporter is set', () => {
    expect(
      collectNames(ticketWith({ title: 'Federico Ciner', assignee: 'Alice' })),
    ).toEqual(['Alice'])
    expect(
      collectNames(ticketWith({ title: 'Federico Ciner', reporter: 'Bob' })),
    ).toEqual(['Bob'])
  })

  it('ignores ticket titles that are not title-case display names', () => {
    expect(collectNames(ticketWith({ title: 'fix login bug' }))).toEqual([])
    expect(collectNames(ticketWith({ title: 'Gitlab SaaS integration' }))).toEqual([])
    expect(collectNames(ticketWith({ title: 'Add user feedback' }))).toEqual([])
  })
})
