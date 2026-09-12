import type { ParsedTicket } from '../jira-parser'
import type { AttachmentPlan } from './attachment-plan'
import { renderMetadata } from './render-metadata'
import { renderDescription } from './render-description'
import { renderComments } from './render-comments'
import { renderAttachments } from './render-attachments'
import { escapeMarkdown } from './markdown-escape'

export { planAttachmentNames } from './attachment-plan'
export type { AttachmentPlan } from './attachment-plan'

export function serializeTicketToMarkdown(ticket: ParsedTicket, attachmentPlan: AttachmentPlan[]): string {
  const sections: string[] = []

  sections.push(`# ${escapeMarkdown(ticket.key)} — ${escapeMarkdown(ticket.title)}`)

  const metadata = renderMetadata(ticket)
  if (metadata.length > 0) sections.push(metadata.join('  \n'))

  const description = renderDescription(ticket.description)
  if (description.length > 0) {
    sections.push(['## Description', ...description].join('\n\n'))
  }

  const attachments = renderAttachments(attachmentPlan)
  if (attachments.length > 0) {
    sections.push(['## Attachments', ...attachments].join('\n'))
  }

  const comments = renderComments(ticket.comments)
  if (comments.length > 0) {
    sections.push(['## Comments', ...comments].join('\n\n'))
  }

  return sections.join('\n\n') + '\n'
}
