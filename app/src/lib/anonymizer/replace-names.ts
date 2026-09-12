function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildReplacementRegex(aliasMap: Map<string, string>): RegExp | undefined {
  if (aliasMap.size === 0) return undefined
  const names = Array.from(aliasMap.keys()).sort((a, b) => b.length - a.length)
  const pattern = names.map(escapeRegExp).join('|')
  // Unicode-aware boundaries: \b in JS only matches ASCII word chars.
  return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${pattern})(?![\\p{L}\\p{N}_])`, 'gu')
}

export function replaceNames(text: string, aliasMap: Map<string, string>): string {
  const regex = buildReplacementRegex(aliasMap)
  if (!regex) return text
  return text.replace(regex, (match) => aliasMap.get(match) ?? match)
}

function serializeTemplateContent(template: HTMLTemplateElement): string {
  return Array.from(template.content.childNodes)
    .map((node) => {
      if (node instanceof HTMLElement) return node.outerHTML
      return node.textContent ?? ''
    })
    .join('')
}

/** Replaces names in HTML text nodes only — attribute values (e.g. href) are left untouched. */
export function replaceNamesInHtml(html: string, aliasMap: Map<string, string>): string {
  if (aliasMap.size === 0) return html

  const doc = new DOMParser().parseFromString('<!DOCTYPE html><html><body></body></html>', 'text/html')
  const template = doc.createElement('template')
  template.innerHTML = html

  const walker = doc.createTreeWalker(template.content, NodeFilter.SHOW_TEXT)
  let textNode = walker.nextNode()
  while (textNode) {
    const current = textNode.textContent ?? ''
    const replaced = replaceNames(current, aliasMap)
    if (replaced !== current) {
      textNode.textContent = replaced
    }
    textNode = walker.nextNode()
  }

  return serializeTemplateContent(template)
}
