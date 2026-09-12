import type { ParsedTicket } from '../jira-parser'
import { escapeMarkdown } from './markdown-escape'

function field(label: string, value: string | undefined): string | undefined {
  if (!value) return undefined
  return `**${label}:** ${escapeMarkdown(value)}`
}

function listField(label: string, values: string[]): string | undefined {
  if (values.length === 0) return undefined
  return `**${label}:** ${values.map(escapeMarkdown).join(', ')}`
}

export function renderMetadata(ticket: ParsedTicket): string[] {
  return [
    field('Type', ticket.type),
    field('Status', ticket.status),
    field('Resolution', ticket.resolution),
    field('Priority', ticket.priority),
    listField('Components', ticket.components),
    listField('Labels', ticket.labels),
    field('Assignee', ticket.assignee),
    field('Reporter', ticket.reporter),
    field('Created', ticket.created),
    field('Updated', ticket.updated),
  ].filter((line): line is string => Boolean(line))
}
