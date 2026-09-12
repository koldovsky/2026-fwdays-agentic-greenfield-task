// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { renderDescription } from './render-description'
import type { DescriptionBlock } from '../jira-parser'

describe('renderDescription', () => {
  it('converts a heading with its level', () => {
    const blocks: DescriptionBlock[] = [{ kind: 'heading', level: 3, html: 'Issue Summary' }]
    expect(renderDescription(blocks)).toEqual(['### Issue Summary'])
  })

  it('converts an inline link inside a paragraph to Markdown link syntax', () => {
    const blocks: DescriptionBlock[] = [
      { kind: 'paragraph', html: 'See <a href="https://example.com">example</a> for details.' },
    ]
    expect(renderDescription(blocks)).toEqual(['See [example](https://example.com) for details.'])
  })

  it('converts bold text inside a paragraph', () => {
    const blocks: DescriptionBlock[] = [{ kind: 'paragraph', html: 'This is <b>important</b>.' }]
    expect(renderDescription(blocks)).toEqual(['This is **important**.'])
  })

  it('renders an unordered list with - markers, preserving item order', () => {
    const blocks: DescriptionBlock[] = [{ kind: 'list', ordered: false, items: ['First', 'Second'] }]
    expect(renderDescription(blocks)).toEqual(['- First\n- Second'])
  })

  it('renders an ordered list with numeric markers', () => {
    const blocks: DescriptionBlock[] = [{ kind: 'list', ordered: true, items: ['First', 'Second'] }]
    expect(renderDescription(blocks)).toEqual(['1. First\n2. Second'])
  })

  it('renders a code block as a fenced block with the language info string', () => {
    const blocks: DescriptionBlock[] = [{ kind: 'code', code: 'npm install', language: 'bash' }]
    expect(renderDescription(blocks)).toEqual(['```bash\nnpm install\n```'])
  })

  it('renders a code block with no language as a plain fenced block', () => {
    const blocks: DescriptionBlock[] = [{ kind: 'code', code: 'plain text' }]
    expect(renderDescription(blocks)).toEqual(['```\nplain text\n```'])
  })

  it('uses a longer fence when the code contains triple backticks', () => {
    const blocks: DescriptionBlock[] = [{ kind: 'code', code: '```not a fence```', language: 'txt' }]
    expect(renderDescription(blocks)).toEqual(['````txt\n```not a fence```\n````'])
  })
})
