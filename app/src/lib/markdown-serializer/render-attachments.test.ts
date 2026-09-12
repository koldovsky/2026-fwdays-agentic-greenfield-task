import { describe, expect, it } from 'vitest'
import { renderAttachments } from './render-attachments'
import { planAttachmentNames } from './attachment-plan'

describe('renderAttachments', () => {
  it('wraps file names with spaces or parentheses in a safe markdown URL', () => {
    const plans = planAttachmentNames([{ name: 'screenshot (1).png', url: 'https://example.com/x' }])
    expect(renderAttachments(plans)).toEqual(['- [screenshot (1).png](<media/01-screenshot%20%281%29.png>)'])
  })
})
