import type { ParsedAttachment, AttachmentParseIssue } from './types'

function resolveAttachmentUrl(href: string, root: ParentNode): string | undefined {
  try {
    const base =
      root instanceof Document && root.baseURI
        ? root.baseURI
        : root.ownerDocument?.baseURI ?? 'https://jira.example.com/'
    const url = new URL(href, base)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
    return url.href
  } catch {
    return undefined
  }
}

export interface ParseAttachmentsResult {
  attachments: ParsedAttachment[]
  skipped: AttachmentParseIssue[]
}

export function parseAttachments(root: ParentNode): ParseAttachmentsResult {
  const container = root.querySelector('#attachmentmodule')
  if (!container) return { attachments: [], skipped: [] }

  const attachments: ParsedAttachment[] = []
  const skipped: AttachmentParseIssue[] = []

  for (const a of container.querySelectorAll('a.attachment-title')) {
    const name = a.textContent?.trim()
    const href = a.getAttribute('href')

    if (!name) {
      skipped.push({ name: '', reason: 'Attachment title is missing.' })
      continue
    }

    if (!href) {
      skipped.push({ name, reason: 'Attachment link is missing href.' })
      continue
    }

    const url = resolveAttachmentUrl(href, root)
    if (!url) {
      skipped.push({ name, reason: 'Could not resolve attachment URL.' })
      continue
    }

    attachments.push({ name, url })
  }

  return { attachments, skipped }
}
