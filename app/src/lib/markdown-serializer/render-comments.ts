import type { ParsedComment } from '../jira-parser'
import { escapeMarkdown } from './markdown-escape'

export function renderComments(comments: ParsedComment[]): string[] {
  return comments.map((comment) => {
    const author = comment.author ? escapeMarkdown(comment.author) : 'Unknown'
    return `**${author}:** ${escapeMarkdown(comment.body)}`
  })
}
