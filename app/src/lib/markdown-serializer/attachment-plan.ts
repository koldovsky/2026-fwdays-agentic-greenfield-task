import type { ParsedAttachment } from '../jira-parser'

export interface AttachmentPlan {
  url: string
  name: string
  fileName: string
}

// eslint-disable-next-line no-control-regex -- stripping control chars is intentional for filesystem safety
const FORBIDDEN_CHARS = /[<>:"/\\|?*\x00-\x1F]/g

function sanitizeFileName(name: string): string {
  return name.replace(FORBIDDEN_CHARS, '')
}

export function planAttachmentNames(attachments: ParsedAttachment[]): AttachmentPlan[] {
  return attachments.map((attachment, index) => {
    const prefix = String(index + 1).padStart(2, '0')
    const safeName = sanitizeFileName(attachment.name)
    return { url: attachment.url, name: attachment.name, fileName: `${prefix}-${safeName}` }
  })
}
