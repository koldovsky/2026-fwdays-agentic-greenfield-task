import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseToggle from './BaseToggle.vue'

describe('BaseToggle', () => {
  it('reflects modelValue via aria-checked on a switch role', () => {
    const on = mount(BaseToggle, { props: { modelValue: true } })
    expect(on.attributes('role')).toBe('switch')
    expect(on.attributes('aria-checked')).toBe('true')
    expect(mount(BaseToggle, { props: { modelValue: false } }).attributes('aria-checked')).toBe(
      'false',
    )
  })

  it('emits the toggled value on click', async () => {
    const wrapper = mount(BaseToggle, { props: { modelValue: false } })
    await wrapper.trigger('click')

    const events = wrapper.emitted('update:modelValue')
    expect(events).toBeTruthy()
    expect(events?.[0]).toEqual([true])
  })

  it('renders the disabled attribute when disabled', () => {
    const wrapper = mount(BaseToggle, { props: { modelValue: false, disabled: true } })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })
})
