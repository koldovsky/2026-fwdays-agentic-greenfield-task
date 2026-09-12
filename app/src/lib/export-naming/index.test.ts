import { describe, expect, it } from 'vitest'
import type { ParsedTicket } from '../jira-parser'
import { buildExportPaths } from './index'

function ticket(overrides: Partial<ParsedTicket>): ParsedTicket {
  return {
    key: 'ROVODEV-36',
    title: 'A ticket',
    components: [],
    labels: [],
    description: [],
    comments: [],
    attachments: [],
    ...overrides,
  }
}

describe('buildExportPaths', () => {
  it('derives folder, md file, and media dir from key and title (FR-15, FR-16)', () => {
    expect(buildExportPaths(ticket({ key: 'ROVODEV-36', title: 'Login bug' }))).toEqual({
      folder: 'ROVODEV-36',
      mdFileName: 'ROVODEV-36-Login bug.md',
      mdPath: 'ROVODEV-36/ROVODEV-36-Login bug.md',
      mediaDir: 'ROVODEV-36/media',
    })
  })

  it('keeps Cyrillic in the title without transliteration (FR-18)', () => {
    const paths = buildExportPaths(ticket({ key: 'ABC-1', title: 'Помилка входу' }))
    expect(paths.mdFileName).toBe('ABC-1-Помилка входу.md')
  })

  it('strips filesystem-forbidden characters from the title (FR-18)', () => {
    const paths = buildExportPaths(ticket({ title: 'a/b:c?"d*|e<f>g\\h' }))
    expect(paths.mdFileName).toBe('ROVODEV-36-abcdefgh.md')
  })

  it('collapses and trims whitespace in the title', () => {
    const paths = buildExportPaths(ticket({ title: '  spaced   out\ttitle  ' }))
    expect(paths.mdFileName).toBe('ROVODEV-36-spaced out title.md')
  })

  it('caps an over-long title to a filesystem-safe length', () => {
    const paths = buildExportPaths(ticket({ title: 'x'.repeat(300) }))
    expect(paths.mdFileName.length).toBeLessThanOrEqual('ROVODEV-36-'.length + 100 + '.md'.length)
  })

  it('falls back to the key alone when the title sanitizes to empty', () => {
    const paths = buildExportPaths(ticket({ key: 'KEY-9', title: '///' }))
    expect(paths.mdFileName).toBe('KEY-9.md')
    expect(paths.mdPath).toBe('KEY-9/KEY-9.md')
  })
})
