// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { parseDescription } from './parse-description'
import { loadRovodev36Document, parseFragment } from './test-fixtures'

describe('parseDescription — real ROVODEV-36 fixture', () => {
  const blocks = parseDescription(loadRovodev36Document())

  it('preserves headings distinctly from paragraphs', () => {
    const headings = blocks.filter((b) => b.kind === 'heading')
    expect(headings.length).toBeGreaterThan(0)
    expect(headings[0]).toMatchObject({ kind: 'heading', level: 3 })
  })

  it('preserves a paragraph containing an inline link', () => {
    const linked = blocks.find((b) => b.kind === 'paragraph' && b.html.includes('<a'))
    expect(linked).toBeDefined()
    expect((linked as { html: string }).html).toContain('gitlab.com')
  })

  it('preserves unordered list items separately from paragraph text', () => {
    const list = blocks.find((b) => b.kind === 'list')
    expect(list).toBeDefined()
    if (list?.kind !== 'list') return
    expect(list.ordered).toBe(false)
    expect(list.items.length).toBeGreaterThan(0)
  })
})

describe('parseDescription — hand-authored fixture for content absent from the real page', () => {
  it('preserves ordered lists and code blocks', () => {
    const doc = parseFragment(`
      <div id="description-val">
        <div class="user-content-block">
          <p>Steps:</p>
          <ol><li>First</li><li>Second</li></ol>
          <pre data-lang="bash">npm install</pre>
        </div>
      </div>
    `)
    const blocks = parseDescription(doc)
    expect(blocks).toEqual([
      { kind: 'paragraph', html: 'Steps:' },
      { kind: 'list', ordered: true, items: ['First', 'Second'] },
      { kind: 'code', code: 'npm install', language: 'bash' },
    ])
  })

  it('returns an empty array when there is no description container', () => {
    const doc = parseFragment('<div></div>')
    expect(parseDescription(doc)).toEqual([])
  })
})
