import type { ToneMode } from '@/lib/emergency-intercept/copy'

export interface DashboardCopy {
  metrics: {
    heading: string
    streakLabel: string
    lifetimeLabel: string
  }
  tasks: {
    heading: string
    items: [string, string, string]
  }
  story: {
    heading: string
    nextLabel: string
    fallbackCta: string
  }
}

const calm: DashboardCopy = {
  metrics: {
    heading: 'Your progress',
    streakLabel: 'days of clarity',
    lifetimeLabel: 'lifetime binge-free days',
  },
  tasks: {
    heading: 'Gentle alternatives',
    items: [
      'Take a slow 5-minute walk outside',
      'Text someone you feel safe with',
      'Drink a full glass of water and breathe',
    ],
  },
  story: {
    heading: 'A moment of strength',
    nextLabel: 'Next story',
    fallbackCta: 'Write your own story when you feel ready',
  },
}

const rational: DashboardCopy = {
  metrics: {
    heading: 'Progress metrics',
    streakLabel: 'consecutive binge-free days logged',
    lifetimeLabel: 'total lifetime binge-free days',
  },
  tasks: {
    heading: 'Top 3 alternative actions',
    items: [
      'Execute a 5-minute walk to interrupt the stimulus loop',
      'Contact a trusted person — social circuit-breaker',
      'Hydrate and take 3 slow breaths to reset cortisol response',
    ],
  },
  story: {
    heading: 'Recovery data point',
    nextLabel: 'Next entry',
    fallbackCta: 'Log your own recovery data point to build your dataset',
  },
}

const auntie: DashboardCopy = {
  metrics: {
    heading: 'Look at you go!',
    streakLabel: 'days you showed up!',
    lifetimeLabel: 'lifetime days of winning!',
  },
  tasks: {
    heading: 'Do these instead, haiyaa!',
    items: [
      'Go for a walk right now! Move those legs!',
      'Call or text someone you love! No excuses!',
      'Drink water and breathe! Your body is begging you!',
    ],
  },
  story: {
    heading: 'Someone did amazing!',
    nextLabel: 'Next story!',
    fallbackCta: 'Write your own story! I want to hear it!',
  },
}

export const DASHBOARD_COPY: Record<ToneMode, DashboardCopy> = { calm, rational, auntie }
