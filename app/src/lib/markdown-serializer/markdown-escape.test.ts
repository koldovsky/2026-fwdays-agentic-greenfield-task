import { describe, expect, it } from 'vitest'
import { escapeMarkdown } from './markdown-escape'

describe('escapeMarkdown', () => {
  it('escapes characters that would break markdown structure in free text', () => {
    expect(escapeMarkdown('# heading > quote | table ~strike !important')).toBe(
      '\\# heading \\> quote \\| table \\~strike \\!important',
    )
  })
})
