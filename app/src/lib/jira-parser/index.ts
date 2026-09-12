import type { ParseResult } from './types'
import { parseKey, parseTitle } from './parse-identity'
import { parseType, parseResolution, parsePriority, parseComponents, parseLabels, parseStatus } from './parse-metadata'
import { parseDescription } from './parse-description'
import { parseAssignee, parseReporter, parseCreated, parseUpdated } from './parse-people-dates'
import { parseComments } from './parse-comments'
import { parseAttachments } from './parse-attachments'

export type { ParsedTicket, ParsedComment, ParsedAttachment, AttachmentParseIssue, DescriptionBlock, ParseResult } from './types'

export function parseJiraTicket(root: ParentNode): ParseResult {
  const key = parseKey(root)
  const title = parseTitle(root)

  if (!key || !title) {
    return { ok: false, reason: 'Missing ticket key or title — not a recognized Jira ticket page' }
  }

  const comments = parseComments(root)
  const { attachments, skipped } = parseAttachments(root)

  return {
    ok: true,
    ticket: {
      key,
      title,
      type: parseType(root),
      status: parseStatus(root),
      resolution: parseResolution(root),
      priority: parsePriority(root),
      components: parseComponents(root),
      labels: parseLabels(root),
      description: parseDescription(root),
      assignee: parseAssignee(root),
      reporter: parseReporter(root),
      created: parseCreated(root),
      updated: parseUpdated(root),
      comments,
      attachments,
      ...(skipped.length > 0 ? { attachmentSkips: skipped } : {}),
    },
  }
}
