import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseChip from './BaseChip.vue'

describe('BaseChip', () => {
  it('renders a label prop', () => {
    expect(mount(BaseChip, { props: { label: '432 pages' } }).text()).toContain('432 pages')
  })

  it('renders slotted content', () => {
    expect(mount(BaseChip, { slots: { default: 'English' } }).text()).toContain('English')
  })

  it('neutral variant uses the surface pill with no leading icon', () => {
    const wrapper = mount(BaseChip, { props: { label: 'English' } })
    expect(wrapper.classes()).toContain('bg-surface')
    expect(wrapper.find('svg').exists()).toBe(false)
  })

  it('capability variant uses the green wash and a check icon', () => {
    const wrapper = mount(BaseChip, {
      props: { variant: 'capability' },
      slots: { default: 'Progress sync' },
    })
    expect(wrapper.classes()).toContain('bg-active')
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})
