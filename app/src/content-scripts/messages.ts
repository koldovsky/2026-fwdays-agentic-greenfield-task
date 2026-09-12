import type { ParseResult } from '../lib/jira-parser'

export const PARSE_RESULT_MESSAGE = 'ticket2md:parse-result' as const

export interface TicketParseMessage {
  type: typeof PARSE_RESULT_MESSAGE
  result: ParseResult
}

function isParseResult(value: unknown): value is ParseResult {
  if (typeof value !== 'object' || value === null) return false
  const result = value as { ok?: unknown }
  if (result.ok === true) {
    const ticket = (result as { ticket?: unknown }).ticket
    return (
      typeof ticket === 'object' &&
      ticket !== null &&
      typeof (ticket as { key?: unknown }).key === 'string' &&
      typeof (ticket as { title?: unknown }).title === 'string'
    )
  }
  if (result.ok === false) {
    return typeof (result as { reason?: unknown }).reason === 'string'
  }
  return false
}

export function isTicketParseMessage(value: unknown): value is TicketParseMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === PARSE_RESULT_MESSAGE &&
    isParseResult((value as { result?: unknown }).result)
  )
}
