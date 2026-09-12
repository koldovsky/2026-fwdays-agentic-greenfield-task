import { describe, expect, it } from 'vitest'
import { planAttachmentNames } from './attachment-plan'

describe('planAttachmentNames', () => {
  it('assigns order-preserving numeric prefixes', () => {
    const plans = planAttachmentNames([
      { name: 'a.png', url: 'https://example.com/a.png' },
      { name: 'b.txt', url: 'https://example.com/b.txt' },
      { name: 'c.log', url: 'https://example.com/c.log' },
    ])
    expect(plans.map((p) => p.fileName)).toEqual(['01-a.png', '02-b.txt', '03-c.log'])
  })

  it('strips filesystem-forbidden characters without transliterating', () => {
    const plans = planAttachmentNames([{ name: 'a:b?"c*.png', url: 'https://example.com/x' }])
    expect(plans[0]?.fileName).toBe('01-abc.png')
  })

  it('returns an empty array for no attachments', () => {
    expect(planAttachmentNames([])).toEqual([])
  })

  it('preserves the original name and url alongside the computed file name', () => {
    const plans = planAttachmentNames([{ name: 'orig name.png', url: 'https://example.com/orig' }])
    expect(plans[0]).toEqual({ url: 'https://example.com/orig', name: 'orig name.png', fileName: '01-orig name.png' })
  })
})
