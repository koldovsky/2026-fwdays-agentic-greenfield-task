// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { anonymizeTicket } from './index'
import { parseJiraTicket } from '../jira-parser'
import { loadRovodev36Document } from '../jira-parser/test-fixtures'
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

describe('anonymizeTicket', () => {
  it('replaces assignee, reporter, comment author/body, description, and attachment name consistently', () => {
    const ticket = ticketWith({
      assignee: 'Federico Ciner',
      reporter: 'Seerat',
      description: [{ kind: 'paragraph', html: 'Reported by Federico Ciner originally.' }],
      comments: [{ author: 'Federico Ciner', body: 'Seerat, can you confirm?' }],
      attachments: [{ name: 'Federico Ciner - notes.txt', url: 'https://example.com/notes.txt' }],
    })

    const { ticket: anonymized, aliasMap } = anonymizeTicket(ticket)

    expect(aliasMap.get('Federico Ciner')).toBe('User1')
    expect(aliasMap.get('Seerat')).toBe('User2')

    expect(anonymized.assignee).toBe('User1')
    expect(anonymized.reporter).toBe('User2')
    expect(anonymized.description[0]).toMatchObject({ html: 'Reported by User1 originally.' })
    expect(anonymized.comments[0]).toEqual({ author: 'User1', body: 'User2, can you confirm?' })
    expect(anonymized.attachments[0]).toEqual({
      name: 'User1 - notes.txt',
      url: 'https://example.com/notes.txt',
    })
  })

  it('does not mutate the original ticket', () => {
    const ticket = ticketWith({ assignee: 'Federico Ciner' })
    anonymizeTicket(ticket)
    expect(ticket.assignee).toBe('Federico Ciner')
  })

  it('returns an empty alias map and an unchanged ticket when there are no known names', () => {
    const ticket = ticketWith({ description: [{ kind: 'paragraph', html: 'No names here.' }] })
    const { ticket: anonymized, aliasMap } = anonymizeTicket(ticket)
    expect(aliasMap.size).toBe(0)
    expect(anonymized).toEqual(ticket)
  })

  it('anonymizes title when it contains a known name', () => {
    const ticket = ticketWith({
      title: 'Notes from Federico Ciner',
      assignee: 'Federico Ciner',
    })
    const { ticket: anonymized } = anonymizeTicket(ticket)
    expect(anonymized.title).toBe('Notes from User1')
  })

  it('anonymizes title when the name appears only in the title field', () => {
    const ticket = ticketWith({ title: 'Federico Ciner' })
    const { ticket: anonymized, aliasMap } = anonymizeTicket(ticket)
    expect(aliasMap.get('Federico Ciner')).toBe('User1')
    expect(anonymized.title).toBe('User1')
  })

  it('anonymizes the real ROVODEV-36 fixture (assignee Federico Ciner, reporter Seerat)', () => {
    const result = parseJiraTicket(loadRovodev36Document())
    if (!result.ok) throw new Error('expected successful parse')

    const { ticket: anonymized, aliasMap } = anonymizeTicket(result.ticket)

    expect(aliasMap.get('Federico Ciner')).toBe('User1')
    expect(aliasMap.get('Seerat')).toBe('User2')
    expect(anonymized.assignee).toBe('User1')
    expect(anonymized.reporter).toBe('User2')
  })
})
