import type { DescriptionBlock, ParsedTicket } from '../jira-parser'
import { collectNames } from './collect-names'
import { buildAliasMap } from './alias-map'
import { replaceNames, replaceNamesInHtml } from './replace-names'

function anonymizeBlock(block: DescriptionBlock, aliasMap: Map<string, string>): DescriptionBlock {
  switch (block.kind) {
    case 'heading':
      return { ...block, html: replaceNamesInHtml(block.html, aliasMap) }
    case 'paragraph':
      return { ...block, html: replaceNamesInHtml(block.html, aliasMap) }
    case 'list':
      return { ...block, items: block.items.map((item) => replaceNamesInHtml(item, aliasMap)) }
    case 'code':
      return { ...block, code: replaceNames(block.code, aliasMap) }
  }
}

export interface AnonymizeResult {
  ticket: ParsedTicket
  aliasMap: Map<string, string>
}

export function anonymizeTicket(ticket: ParsedTicket): AnonymizeResult {
  const names = collectNames(ticket)
  const aliasMap = buildAliasMap(names)

  const anonymizedTicket: ParsedTicket = {
    ...ticket,
    title: replaceNames(ticket.title, aliasMap),
    assignee: ticket.assignee ? replaceNames(ticket.assignee, aliasMap) : ticket.assignee,
    reporter: ticket.reporter ? replaceNames(ticket.reporter, aliasMap) : ticket.reporter,
    description: ticket.description.map((block) => anonymizeBlock(block, aliasMap)),
    comments: ticket.comments.map((comment) => ({
      author: comment.author ? replaceNames(comment.author, aliasMap) : comment.author,
      body: replaceNames(comment.body, aliasMap),
    })),
    attachments: ticket.attachments.map((attachment) => ({
      ...attachment,
      name: replaceNames(attachment.name, aliasMap),
    })),
  }

  return { ticket: anonymizedTicket, aliasMap }
}
