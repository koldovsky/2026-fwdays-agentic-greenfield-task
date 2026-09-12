import type { ParsedComment } from './types'
import { textOf } from './dom-utils'

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

export function parseComments(root: ParentNode): ParsedComment[] {
  const container = root.querySelector('#issue_actions_container')
  if (!container) return []

  const commentEls = Array.from(container.querySelectorAll('[id^="comment-"]'))
  return commentEls.map((el) => {
    const author = textOf(el.querySelector('.action-details .user-hover, .action-details a'))
    const bodyText = el.querySelector('.action-body')?.textContent ?? ''
    return { author, body: collapseWhitespace(bodyText) }
  })
}
