import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusDot from './StatusDot.vue'
import BaseStepper from './BaseStepper.vue'
import BaseCard from './BaseCard.vue'
import EmptyState from './EmptyState.vue'
import LoadingSpinner from './LoadingSpinner.vue'

describe('StatusDot', () => {
  it('maps tone to a color token class', () => {
    expect(mount(StatusDot, { props: { tone: 'connected' } }).classes()).toContain('bg-status')
    expect(mount(StatusDot, { props: { tone: 'warning' } }).classes()).toContain('bg-warning')
    expect(mount(StatusDot, { props: { tone: 'muted' } }).classes()).toContain('bg-muted')
  })

  it('exposes a label as an image role when provided', () => {
    const wrapper = mount(StatusDot, { props: { tone: 'connected', label: 'connected' } })
    expect(wrapper.attributes('role')).toBe('img')
    expect(wrapper.attributes('aria-label')).toBe('connected')
  })
})

describe('BaseStepper', () => {
  it('marks the current step active and renders all labels', () => {
    const wrapper = mount(BaseStepper, {
      props: { steps: ['Address', 'Detected', 'Sign in'], current: 2 },
    })
    expect(wrapper.find('[aria-current="step"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Address')
    expect(wrapper.text()).toContain('Detected')
    expect(wrapper.text()).toContain('Sign in')
  })

  it('renders a check for completed (earlier) steps', () => {
    const wrapper = mount(BaseStepper, {
      props: { steps: ['Address', 'Detected', 'Sign in'], current: 3 },
    })
    // two earlier steps are done → two check icons
    expect(wrapper.findAll('svg').length).toBe(2)
  })
})

describe('BaseCard', () => {
  it('renders slotted content on a raised surface', () => {
    const wrapper = mount(BaseCard, { slots: { default: '<p>card body</p>' } })
    expect(wrapper.classes()).toContain('bg-surface')
    expect(wrapper.html()).toContain('card body')
  })
})

describe('EmptyState', () => {
  it('renders title, message and an action slot', () => {
    const wrapper = mount(EmptyState, {
      props: { title: 'Connect a source to begin', message: 'Add a server' },
      slots: { action: '<button>Add source</button>' },
    })
    expect(wrapper.text()).toContain('Connect a source to begin')
    expect(wrapper.text()).toContain('Add a server')
    expect(wrapper.html()).toContain('Add source')
  })
})

describe('LoadingSpinner', () => {
  it('announces itself with role=status and a label', () => {
    const wrapper = mount(LoadingSpinner, { props: { label: 'Loading library…' } })
    expect(wrapper.attributes('role')).toBe('status')
    expect(wrapper.text()).toContain('Loading library…')
  })
})
