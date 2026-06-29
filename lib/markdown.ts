import { remark } from 'remark'
import html from 'remark-html'
import { parseLink, linkHref } from './content/links'

function expandWikiLinks(md: string): string {
  return md.replace(/\[\[([^\]]+)\]\]/g, (whole, inner: string) => {
    const parsed = parseLink(inner.trim())
    if (!parsed) return whole
    const label = parsed.type === 'book' ? parsed.slug : `${parsed.slug}/${parsed.noteId}`
    return `[${label}](${linkHref(parsed)})`
  })
}

export async function renderMarkdown(md: string): Promise<string> {
  const expanded = expandWikiLinks(md)
  const file = await remark().use(html).process(expanded)
  return String(file)
}
