import { queryText } from './dom-utils'

export function parseAssignee(root: ParentNode): string | undefined {
  return queryText(root, '#assignee-val')
}

export function parseReporter(root: ParentNode): string | undefined {
  return queryText(root, '#reporter-val')
}

function parseDateField(root: ParentNode, selector: string): string | undefined {
  const time = root.querySelector(`${selector} time`)
  const iso = time?.getAttribute('datetime')
  if (iso) return iso
  return queryText(root, selector)
}

export function parseCreated(root: ParentNode): string | undefined {
  return parseDateField(root, '#created-val')
}

export function parseUpdated(root: ParentNode): string | undefined {
  return parseDateField(root, '#updated-val')
}
