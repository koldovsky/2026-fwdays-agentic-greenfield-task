// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { parseJiraTicket } from './index'
import { loadRovodev36Document, parseFragment } from './test-fixtures'

// FR-01, FR-02, NFR-07 — real saved Jira page from examples/; DOM-only parse, no network.
describe('parseJiraTicket — real ROVODEV-36 fixture (FR-01, FR-02, NFR-07)', () => {
  const result = parseJiraTicket(loadRovodev36Document())

  it('parses key and title (FR-02, FR-10)', () => {
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ticket.key).toBe('ROVODEV-36')
    expect(result.ticket.title).toBe('Gitlab SaaS integration with Rovo Dev')
  })

  it('parses type and resolution (FR-10)', () => {
    if (!result.ok) throw new Error('expected successful parse')
    expect(result.ticket.type).toContain('Suggestion')
    expect(result.ticket.resolution?.trim()).toBe('Unresolved')
  })

  it('parses status via legacy opsbar fallback when #status-val is absent (FR-01, FR-10)', () => {
    if (!result.ok) throw new Error('expected successful parse')
    expect(result.ticket.status).toBe('Gathering Interest')
  })

  it('parses components (FR-10)', () => {
    if (!result.ok) throw new Error('expected successful parse')
    expect(result.ticket.components).toEqual(['Rovo Dev CLI'])
  })

  it('leaves priority and labels empty when absent from DOM (FR-10)', () => {
    if (!result.ok) throw new Error('expected successful parse')
    expect(result.ticket.priority).toBeUndefined()
    expect(result.ticket.labels).toEqual([])
  })

  it('parses assignee and reporter (FR-10)', () => {
    if (!result.ok) throw new Error('expected successful parse')
    expect(result.ticket.assignee).toBe('Federico Ciner')
    expect(result.ticket.reporter).toBe('Seerat')
  })

  it('parses created/updated from <time datetime> attributes (FR-10)', () => {
    if (!result.ok) throw new Error('expected successful parse')
    expect(result.ticket.created).toBe('2026-06-18T07:51:20+0000')
    expect(result.ticket.updated).toBe('2026-06-18T08:07:17+0000')
  })

  it('returns comments: [] when the ticket has none (FR-10)', () => {
    if (!result.ok) throw new Error('expected successful parse')
    expect(result.ticket.comments).toEqual([])
  })

  it('returns attachments: [] when the ticket has none (FR-11)', () => {
    if (!result.ok) throw new Error('expected successful parse')
    expect(result.ticket.attachments).toEqual([])
  })

  it('parses description as non-empty structured blocks (FR-10)', () => {
    if (!result.ok) throw new Error('expected successful parse')
    expect(result.ticket.description.length).toBeGreaterThan(0)
    expect(result.ticket.description[0]).toMatchObject({ kind: 'heading', level: 3 })
  })
})

// FR-02, FR-08 — honest parse failure instead of a partial ticket for popup error state.
describe('parseJiraTicket — failure path (FR-02, FR-08)', () => {
  it('reports failure when key is missing (FR-02, FR-08)', () => {
    const doc = parseFragment('<div id="summary-val"><h2>Title only</h2></div>')
    const result = parseJiraTicket(doc)
    expect(result.ok).toBe(false)
  })

  it('reports failure when title is missing (FR-02, FR-08)', () => {
    const doc = parseFragment('<a id="key-val">PROJ-1</a>')
    const result = parseJiraTicket(doc)
    expect(result.ok).toBe(false)
  })

  it('reports failure on a non-Jira page (FR-02, FR-04)', () => {
    const doc = parseFragment('<html><body><h1>Not Jira</h1></body></html>')
    const result = parseJiraTicket(doc)
    expect(result.ok).toBe(false)
  })
})

// Hand-authored DOM fragments for fields absent from the real ROVODEV-36 fixture.
describe('parseJiraTicket — hand-authored fixtures (FR-10, FR-11, FR-12)', () => {
  it('parses priority and labels when present (FR-10)', () => {
    const doc = parseFragment(`
      <a id="key-val">PROJ-2</a>
      <div id="summary-val"><h2>Ticket with priority and labels</h2></div>
      <span id="priority-val">High</span>
      <span id="labels-val"><a>backend</a><a>urgent</a></span>
    `)
    const result = parseJiraTicket(doc)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ticket.priority).toBe('High')
    expect(result.ticket.labels).toEqual(['backend', 'urgent'])
  })

  it('parses comments in DOM order when present (FR-10)', () => {
    const doc = parseFragment(`
      <a id="key-val">PROJ-3</a>
      <div id="summary-val"><h2>Ticket with comments</h2></div>
      <div id="issue_actions_container">
        <div id="comment-1">
          <div class="action-details"><a class="user-hover">Alice</a></div>
          <div class="action-body">First comment</div>
        </div>
        <div id="comment-2">
          <div class="action-details"><a class="user-hover">Bob</a></div>
          <div class="action-body">Second comment</div>
        </div>
      </div>
    `)
    const result = parseJiraTicket(doc)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ticket.comments).toEqual([
      { author: 'Alice', body: 'First comment' },
      { author: 'Bob', body: 'Second comment' },
    ])
  })

  it('parses attachment metadata without fetching bytes (FR-02, FR-11)', () => {
    const doc = parseFragment(`
      <a id="key-val">PROJ-4</a>
      <div id="summary-val"><h2>Ticket with attachments</h2></div>
      <div id="attachmentmodule">
        <a class="attachment-title" href="https://example.com/files/screenshot.png">screenshot.png</a>
        <a class="attachment-title" href="https://example.com/files/log.txt">log.txt</a>
      </div>
    `)
    const result = parseJiraTicket(doc)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ticket.attachments).toEqual([
      { name: 'screenshot.png', url: 'https://example.com/files/screenshot.png' },
      { name: 'log.txt', url: 'https://example.com/files/log.txt' },
    ])
  })

  it('resolves relative attachment hrefs to absolute URLs (FR-11)', () => {
    const doc = parseFragment(`
      <a id="key-val">PROJ-5</a>
      <div id="summary-val"><h2>Relative attachment</h2></div>
      <div id="attachmentmodule">
        <a class="attachment-title" href="/secure/attachment/12345/screenshot.png">screenshot.png</a>
      </div>
    `)
    const result = parseJiraTicket(doc)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ticket.attachments[0]?.url).toMatch(/\/secure\/attachment\/12345\/screenshot\.png$/)
  })

  it('records attachmentSkips when attachment title is missing (FR-12)', () => {
    const doc = parseFragment(`
      <a id="key-val">PROJ-7</a>
      <div id="summary-val"><h2>Untitled attachment</h2></div>
      <div id="attachmentmodule">
        <a class="attachment-title" href="/secure/attachment/99/file.png"></a>
      </div>
    `)
    const result = parseJiraTicket(doc)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ticket.attachments).toEqual([])
    expect(result.ticket.attachmentSkips).toEqual([
      { name: '', reason: 'Attachment title is missing.' },
    ])
  })

  it('records attachmentSkips when href cannot be resolved (FR-12)', () => {
    const doc = parseFragment(`
      <a id="key-val">PROJ-6</a>
      <div id="summary-val"><h2>Bad attachment link</h2></div>
      <div id="attachmentmodule">
        <a class="attachment-title" href="ftp://bad.example/broken.png">broken.png</a>
      </div>
    `)
    const result = parseJiraTicket(doc)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.ticket.attachments).toEqual([])
    expect(result.ticket.attachmentSkips).toEqual([
      { name: 'broken.png', reason: 'Could not resolve attachment URL.' },
    ])
  })
})
