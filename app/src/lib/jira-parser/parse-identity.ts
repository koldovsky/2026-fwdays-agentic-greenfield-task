import { queryText } from './dom-utils'

export function parseKey(root: ParentNode): string | undefined {
  return queryText(root, '#key-val')
}

export function parseTitle(root: ParentNode): string | undefined {
  return queryText(root, '#summary-val h2') ?? queryText(root, '#summary-val')
}
