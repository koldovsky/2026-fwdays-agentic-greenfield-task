const MARKDOWN_SPECIAL = /[\\`*_[\]#>|~!]/g

export function escapeMarkdown(text: string): string {
  return text.replace(MARKDOWN_SPECIAL, (match) => `\\${match}`)
}

/** CommonMark-safe URL for inline link destinations (spaces, parentheses). */
export function escapeMarkdownUrl(url: string): string {
  return url.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29')
}
