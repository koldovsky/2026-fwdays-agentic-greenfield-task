import type { AttachmentPlan } from './attachment-plan'
import { escapeMarkdown, escapeMarkdownUrl } from './markdown-escape'

export function renderAttachments(plans: AttachmentPlan[]): string[] {
  return plans.map((plan) => {
    const url = escapeMarkdownUrl(`media/${plan.fileName}`)
    return `- [${escapeMarkdown(plan.name)}](<${url}>)`
  })
}
