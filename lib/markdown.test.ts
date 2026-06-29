import { describe, it, expect } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('renders basic markdown', async () => {
    const html = await renderMarkdown('# Title\n\nSome **bold** text.')
    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<strong>bold</strong>')
  })

  it('converts a book wiki-link', async () => {
    const html = await renderMarkdown('See [[book:deep-work]] for more.')
    expect(html).toContain('<a href="/book/deep-work">deep-work</a>')
  })

  it('converts a note wiki-link', async () => {
    const html = await renderMarkdown('Compare [[note:deep-work/n-x9]].')
    expect(html).toContain('<a href="/book/deep-work#n-x9">deep-work/n-x9</a>')
  })

  it('leaves malformed wiki-links as text', async () => {
    const html = await renderMarkdown('Broken [[nonsense]] here.')
    expect(html).toContain('[[nonsense]]')
  })
})
