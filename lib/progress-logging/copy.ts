import type { ToneMode } from '@/lib/emergency-intercept/copy'

export interface ProgressCopy {
  checkIn: {
    heading: string
    buttonLabel: string
    alreadyLoggedLabel: string
    streakLabel: string
    lifetimeLabel: string
  }
  story: {
    heading: string
    placeholder: string
    submitLabel: string
    successMessage: string
  }
}

const calm: ProgressCopy = {
  checkIn: {
    heading: 'How are you doing today',
    buttonLabel: 'Mark today as binge-free',
    alreadyLoggedLabel: 'You have already checked in today',
    streakLabel: 'day streak',
    lifetimeLabel: 'lifetime days',
  },
  story: {
    heading: 'Share a moment of strength',
    placeholder: 'What went well today, or what helped you through a difficult moment',
    submitLabel: 'Save story',
    successMessage: 'Your story has been saved',
  },
}

const rational: ProgressCopy = {
  checkIn: {
    heading: 'Daily status log',
    buttonLabel: 'Log binge-free day',
    alreadyLoggedLabel: 'Today already logged.',
    streakLabel: 'day streak',
    lifetimeLabel: 'lifetime days',
  },
  story: {
    heading: 'Record a recovery data point',
    placeholder: 'Describe the event, the trigger, and how you responded.',
    submitLabel: 'Submit entry',
    successMessage: 'Entry recorded.',
  },
}

const auntie: ProgressCopy = {
  checkIn: {
    heading: 'Did you stay strong today?',
    buttonLabel: 'Yes! Mark today as binge-free!',
    alreadyLoggedLabel: 'Already done for today! So proud of you!',
    streakLabel: 'day streak',
    lifetimeLabel: 'lifetime days',
  },
  story: {
    heading: 'Tell me something good that happened!',
    placeholder: 'Write it all down! Every win counts, no matter how small!',
    submitLabel: 'Save it!',
    successMessage: 'Saved! I love this for you!',
  },
}

export const PROGRESS_COPY: Record<ToneMode, ProgressCopy> = { calm, rational, auntie }
