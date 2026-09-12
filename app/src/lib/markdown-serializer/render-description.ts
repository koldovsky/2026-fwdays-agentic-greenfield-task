import TurndownService from 'turndown'
import type { DescriptionBlock } from '../jira-parser'

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
})

function convertInline(html: string): string {
  return turndownService.turndown(html).trim()
}

function fenceCode(code: string, language?: string): string {
  let fence = '```'
  while (code.includes(fence)) {
    fence += '`'
  }
  const lang = language ?? ''
  return `${fence}${lang}\n${code}\n${fence}`
}

export function renderDescription(blocks: DescriptionBlock[]): string[] {
  return blocks.map((block) => {
    switch (block.kind) {
      case 'heading':
        return `${'#'.repeat(block.level)} ${convertInline(block.html)}`
      case 'paragraph':
        return convertInline(block.html)
      case 'list':
        return block.items
          .map((item, index) => `${block.ordered ? `${index + 1}.` : '-'} ${convertInline(item)}`)
          .join('\n')
      case 'code':
        return fenceCode(block.code, block.language)
    }
  })
}
