import type { DescriptionBlock } from './types'

const HEADING_RE = /^H([1-6])$/

function parseListBlock(el: Element): DescriptionBlock {
  const items = Array.from(el.querySelectorAll(':scope > li')).map((li) => li.innerHTML.trim())
  return { kind: 'list', ordered: el.tagName === 'OL', items }
}

function parseCodeBlock(el: Element): DescriptionBlock {
  const code = el.textContent ?? ''
  const language = el.getAttribute('data-lang') ?? undefined
  return { kind: 'code', code, language }
}

export function parseDescription(root: ParentNode): DescriptionBlock[] {
  const container = root.querySelector('#description-val .user-content-block') ?? root.querySelector('#description-val')
  if (!container) return []

  const blocks: DescriptionBlock[] = []
  for (const el of Array.from(container.children)) {
    const headingMatch = HEADING_RE.exec(el.tagName)
    if (headingMatch) {
      blocks.push({ kind: 'heading', level: Number(headingMatch[1]), html: el.innerHTML.trim() })
    } else if (el.tagName === 'P') {
      const html = el.innerHTML.trim()
      if (html) blocks.push({ kind: 'paragraph', html })
    } else if (el.tagName === 'UL' || el.tagName === 'OL') {
      blocks.push(parseListBlock(el))
    } else if (el.tagName === 'PRE') {
      blocks.push(parseCodeBlock(el))
    }
  }
  return blocks
}
