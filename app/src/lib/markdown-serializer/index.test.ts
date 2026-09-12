// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { parseJiraTicket } from '../jira-parser'
import { loadRovodev36Document } from '../jira-parser/test-fixtures'
import { serializeTicketToMarkdown, planAttachmentNames } from './index'

describe('serializeTicketToMarkdown — real ROVODEV-36 fixture', () => {
  const result = parseJiraTicket(loadRovodev36Document())
  if (!result.ok) throw new Error('expected successful parse')
  const markdown = serializeTicketToMarkdown(result.ticket, planAttachmentNames(result.ticket.attachments))

  it('starts with a heading containing the key and title', () => {
    expect(markdown).toContain('# ROVODEV-36 — Gitlab SaaS integration with Rovo Dev')
  })

  it('includes populated metadata fields', () => {
    expect(markdown).toContain('**Type:** Suggestion')
    expect(markdown).toContain('**Status:** Gathering Interest')
    expect(markdown).toContain('**Components:** Rovo Dev CLI')
  })

  it('omits absent optional metadata fields (priority, labels)', () => {
    expect(markdown).not.toContain('**Priority:**')
    expect(markdown).not.toContain('**Labels:**')
  })

  it('includes the description section with converted content', () => {
    expect(markdown).toContain('## Description')
    expect(markdown).toContain('[gitlab.com](http://gitlab.com/)')
  })

  it('omits the Attachments and Comments sections — this ticket has neither', () => {
    expect(markdown).not.toContain('## Attachments')
    expect(markdown).not.toContain('## Comments')
  })
})

describe('serializeTicketToMarkdown — attachments and comments present', () => {
  it('references attachments via media/<prefix>-<name>, not the original URL', () => {
    const ticket = {
      key: 'PROJ-1',
      title: 'Title',
      components: [],
      labels: [],
      description: [],
      comments: [],
      attachments: [{ name: 'screenshot.png', url: 'https://example.com/files/screenshot.png' }],
    }
    const plan = planAttachmentNames(ticket.attachments)
    const markdown = serializeTicketToMarkdown(ticket, plan)
    expect(markdown).toContain('## Attachments')
    expect(markdown).toContain('[screenshot.png](<media/01-screenshot.png>)')
    expect(markdown).not.toContain('https://example.com/files/screenshot.png')
  })

  it('renders comments as **Author:** body', () => {
    const ticket = {
      key: 'PROJ-2',
      title: 'Title',
      components: [],
      labels: [],
      description: [],
      comments: [{ author: 'Alice', body: 'Looks good to me.' }],
      attachments: [],
    }
    const markdown = serializeTicketToMarkdown(ticket, [])
    expect(markdown).toContain('## Comments')
    expect(markdown).toContain('**Alice:** Looks good to me.')
  })
})
