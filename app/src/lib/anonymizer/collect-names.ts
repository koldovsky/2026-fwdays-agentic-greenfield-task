import type { ParsedTicket } from '../jira-parser'

/** Title-case Jira display names: "First Last" or "First Middle Last" (2–3 words). */
const DISPLAY_NAME = /^[\p{Lu}][\p{Ll}'-]*(?:\s+[\p{Lu}][\p{Ll}'-]*){1,2}$/u

function looksLikeDisplayName(text: string): boolean {
  return DISPLAY_NAME.test(text.trim())
}

export function collectNames(ticket: ParsedTicket): string[] {
  const names: string[] = []
  const seen = new Set<string>()

  function add(name: string | undefined): void {
    if (!name || seen.has(name)) return
    seen.add(name)
    names.push(name)
  }

  add(ticket.assignee)
  add(ticket.reporter)
  for (const comment of ticket.comments) {
    add(comment.author)
  }
  if (!ticket.assignee && !ticket.reporter && looksLikeDisplayName(ticket.title)) {
    add(ticket.title.trim())
  }

  return names
}
