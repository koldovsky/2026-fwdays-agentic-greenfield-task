import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import SegmentedControl, { type SegmentOption } from './SegmentedControl.vue'

const options: SegmentOption[] = [
  { value: 'grid', label: 'Grid', icon: 'library' },
  { value: 'list', label: 'List', icon: 'home' },
]

describe('SegmentedControl', () => {
  it('emits update:modelValue with the clicked segment value', async () => {
    const wrapper = mount(SegmentedControl, { props: { modelValue: 'grid', options } })
    await wrapper.get('button:nth-child(2)').trigger('click')

    const events = wrapper.emitted('update:modelValue')
    expect(events).toBeTruthy()
    expect(events?.[0]).toEqual(['list'])
  })

  it('marks the active segment with aria-pressed', () => {
    const wrapper = mount(SegmentedControl, { props: { modelValue: 'list', options } })
    expect(wrapper.get('button:nth-child(1)').attributes('aria-pressed')).toBe('false')
    expect(wrapper.get('button:nth-child(2)').attributes('aria-pressed')).toBe('true')
  })

  it('exposes an icon-only segment label to assistive tech', () => {
    const wrapper = mount(SegmentedControl, { props: { modelValue: 'grid', options } })
    expect(wrapper.get('button:nth-child(1)').attributes('aria-label')).toBe('Grid')
  })
})
