import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ProgressBar from './ProgressBar.vue'

const FILL = '[role="progressbar"] > div'

describe('ProgressBar', () => {
  it('sets the fill width to the value percentage', () => {
    const wrapper = mount(ProgressBar, { props: { value: 38 } })
    expect(wrapper.get(FILL).attributes('style')).toContain('width: 38%')
  })

  it('clamps values above 100 and below 0', () => {
    expect(
      mount(ProgressBar, { props: { value: 140 } })
        .get(FILL)
        .attributes('style'),
    ).toContain('width: 100%')
    expect(
      mount(ProgressBar, { props: { value: -10 } })
        .get(FILL)
        .attributes('style'),
    ).toContain('width: 0%')
  })

  it('exposes the percentage to assistive tech via aria-valuenow', () => {
    const wrapper = mount(ProgressBar, { props: { value: 38, label: 'Reading progress' } })
    const bar = wrapper.get('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBe('38')
    expect(bar.attributes('aria-valuemin')).toBe('0')
    expect(bar.attributes('aria-valuemax')).toBe('100')
    expect(bar.attributes('aria-label')).toBe('Reading progress')
  })
})
