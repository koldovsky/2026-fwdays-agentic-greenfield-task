import { queryText } from './dom-utils'

function parseLinkList(root: ParentNode, containerSelector: string): string[] {
  const container = root.querySelector(containerSelector)
  if (!container) return []
  return Array.from(container.querySelectorAll('a'))
    .map((a) => a.textContent?.trim())
    .filter((text): text is string => Boolean(text))
}

export function parseType(root: ParentNode): string | undefined {
  return queryText(root, '#type-val')
}

export function parseResolution(root: ParentNode): string | undefined {
  return queryText(root, '#resolution-val')
}

export function parsePriority(root: ParentNode): string | undefined {
  return queryText(root, '#priority-val')
}

export function parseComponents(root: ParentNode): string[] {
  return parseLinkList(root, '#components-val')
}

export function parseLabels(root: ParentNode): string[] {
  return parseLinkList(root, '#labels-val')
}

export function parseStatus(root: ParentNode): string | undefined {
  return queryText(root, '#status-val') ?? queryText(root, '#opsbar-transitions_more .dropdown-text')
}
