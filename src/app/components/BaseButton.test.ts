import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from './BaseButton.vue'

describe('BaseButton', () => {
  it('renders the forest primary variant by default', () => {
    const wrapper = mount(BaseButton, { slots: { default: 'Continue reading' } })
    expect(wrapper.classes()).toContain('bg-primary')
    expect(wrapper.text()).toContain('Continue reading')
  })

  it('renders a bordered secondary variant', () => {
    const wrapper = mount(BaseButton, { props: { variant: 'secondary' } })
    expect(wrapper.classes()).toContain('bg-surface')
    expect(wrapper.classes()).toContain('border')
  })

  it('reflects the disabled state', () => {
    const wrapper = mount(BaseButton, { props: { disabled: true } })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })

  it('honours the requested button type', () => {
    expect(mount(BaseButton, { props: { type: 'submit' } }).attributes('type')).toBe('submit')
    expect(mount(BaseButton).attributes('type')).toBe('button')
  })

  it('renders a leading icon when given', () => {
    expect(
      mount(BaseButton, { props: { icon: 'add' } })
        .find('svg')
        .exists(),
    ).toBe(true)
    expect(mount(BaseButton).find('svg').exists()).toBe(false)
  })
})
