export type ToneMode = 'calm' | 'rational' | 'auntie'

export interface Phase1Option {
  value: 'sad' | 'anxious' | 'frustrated' | 'guilty'
  label: string
}

export interface Phase2Option {
  value: string
  label: string
}

export interface Phase3Option {
  value: string
  label: string
  isCoping: boolean
}

export interface WizardCopy {
  modalTitle: string
  phase1: {
    heading: string
    subheading: string
    options: Phase1Option[]
    nextLabel: string
  }
  phase2: {
    heading: string
    subheading: string
    options: Phase2Option[]
    nextLabel: string
  }
  phase3: {
    heading: string
    subheading: string
    options: Phase3Option[]
    submitLabel: string
  }
  summary: {
    heading: string
    subheading: string
    doneLabel: string
    storySectionLabel: string
  }
  exitConfirm: {
    heading: string
    body: string
    confirmLabel: string
    cancelLabel: string
  }
}

// ── Calm (Zen Sanctuary) — no exclamation marks ──────────────────────────────
const calm: WizardCopy = {
  modalTitle: 'Take a breath',
  phase1: {
    heading: 'What are you feeling right now',
    subheading:
      'Notice the emotion without judgement. There is nothing wrong with you.',
    options: [
      { value: 'sad', label: 'Sad' },
      { value: 'anxious', label: 'Anxious' },
      { value: 'frustrated', label: 'Frustrated' },
      { value: 'guilty', label: 'Guilty' },
    ],
    nextLabel: 'Continue',
  },
  phase2: {
    heading: 'Where do you feel it in your body',
    subheading: 'Select everything that is present for you right now.',
    options: [
      { value: 'chest-tightness', label: 'Tightness in the chest' },
      { value: 'shallow-breathing', label: 'Shallow breathing' },
      { value: 'racing-heart', label: 'Racing heart' },
      { value: 'restlessness', label: 'Restlessness' },
      { value: 'fatigue', label: 'Fatigue' },
      { value: 'stomach-unease', label: 'Unease in the stomach' },
      { value: 'jaw-tension', label: 'Jaw or shoulder tension' },
      { value: 'urge-to-escape', label: 'Urge to escape or numb out' },
    ],
    nextLabel: 'Continue',
  },
  phase3: {
    heading: 'What are you doing or considering right now',
    subheading:
      'Be honest with yourself. Awareness is the first step toward change.',
    options: [
      { value: 'deep-breath', label: 'Taking slow, deep breaths', isCoping: true },
      { value: 'walk', label: 'Going for a short walk', isCoping: true },
      { value: 'call-someone', label: 'Reaching out to someone I trust', isCoping: true },
      { value: 'journaling', label: 'Writing my thoughts down', isCoping: true },
      { value: 'scrolling', label: 'Mindless scrolling or browsing', isCoping: false },
      { value: 'isolation', label: 'Pulling away from people', isCoping: false },
      { value: 'binge-urge', label: 'Thinking about bingeing', isCoping: false },
      { value: 'avoidance', label: 'Avoiding how I feel', isCoping: false },
    ],
    submitLabel: 'Complete reflection',
  },
  summary: {
    heading: 'You paused. That matters.',
    subheading:
      'You have taken a moment to understand yourself a little better. That is an act of care.',
    doneLabel: 'Close',
    storySectionLabel: 'Someone who understands',
  },
  exitConfirm: {
    heading: 'Leave this reflection',
    body: 'Your progress is saved. You can return to it whenever you are ready.',
    confirmLabel: 'Leave for now',
    cancelLabel: 'Stay here',
  },
}

// ── Rational (The Blueprint) ─────────────────────────────────────────────────
const rational: WizardCopy = {
  modalTitle: 'Urge interrupt initiated',
  phase1: {
    heading: 'Identify the primary emotional variable',
    subheading:
      'Urges are system responses. Naming the trigger is the first step to recalibrating.',
    options: [
      { value: 'sad', label: 'Sad' },
      { value: 'anxious', label: 'Anxious' },
      { value: 'frustrated', label: 'Frustrated' },
      { value: 'guilty', label: 'Guilty' },
    ],
    nextLabel: 'Next',
  },
  phase2: {
    heading: 'Log active physical signals',
    subheading:
      'Somatic data provides a more complete picture of your current state.',
    options: [
      { value: 'chest-tightness', label: 'Chest pressure' },
      { value: 'shallow-breathing', label: 'Restricted breathing pattern' },
      { value: 'racing-heart', label: 'Elevated heart rate' },
      { value: 'restlessness', label: 'Motor restlessness' },
      { value: 'fatigue', label: 'Energy depletion' },
      { value: 'stomach-unease', label: 'GI discomfort' },
      { value: 'jaw-tension', label: 'Muscular tension (jaw / shoulders)' },
      { value: 'urge-to-escape', label: 'Avoidance drive' },
    ],
    nextLabel: 'Next',
  },
  phase3: {
    heading: 'Evaluate current response strategies',
    subheading:
      'Classify whether your active behaviors are adaptive or maladaptive.',
    options: [
      { value: 'deep-breath', label: 'Controlled breathing exercise', isCoping: true },
      { value: 'walk', label: 'Physical movement reset', isCoping: true },
      { value: 'call-someone', label: 'Activating social support network', isCoping: true },
      { value: 'journaling', label: 'Structured self-reflection output', isCoping: true },
      { value: 'scrolling', label: 'Passive stimulation loop', isCoping: false },
      { value: 'isolation', label: 'Social withdrawal', isCoping: false },
      { value: 'binge-urge', label: 'Binge ideation active', isCoping: false },
      { value: 'avoidance', label: 'Emotional suppression', isCoping: false },
    ],
    submitLabel: 'Submit assessment',
  },
  summary: {
    heading: 'Pattern interrupt complete.',
    subheading:
      'You have logged this urge event. Each data point builds a clearer map of your triggers.',
    doneLabel: 'Close',
    storySectionLabel: 'A verified recovery data point',
  },
  exitConfirm: {
    heading: 'Exit assessment',
    body: 'Your draft is saved. You can resume this session at any time.',
    confirmLabel: 'Exit',
    cancelLabel: 'Resume',
  },
}

// ── Auntie (Indian Auntie — High-Impact) ─────────────────────────────────────
const auntie: WizardCopy = {
  modalTitle: 'STOP. Right now!',
  phase1: {
    heading: 'What is going on with you right now?',
    subheading:
      'Beta, do not lie to yourself. Tell me what is actually happening inside you!',
    options: [
      { value: 'sad', label: 'Sad' },
      { value: 'anxious', label: 'Anxious' },
      { value: 'frustrated', label: 'Frustrated' },
      { value: 'guilty', label: 'Guilty' },
    ],
    nextLabel: 'Next!',
  },
  phase2: {
    heading: 'What is your body telling you?',
    subheading:
      'Your body knows before your brain does! Check everything that is happening!',
    options: [
      { value: 'chest-tightness', label: 'Tight chest!' },
      { value: 'shallow-breathing', label: 'Cannot breathe properly!' },
      { value: 'racing-heart', label: 'Heart is racing!' },
      { value: 'restlessness', label: 'Cannot sit still!' },
      { value: 'fatigue', label: 'Exhausted!' },
      { value: 'stomach-unease', label: 'Stomach is upset!' },
      { value: 'jaw-tension', label: 'Jaw is clenched tight!' },
      { value: 'urge-to-escape', label: 'Just want to run away!' },
    ],
    nextLabel: 'Next!',
  },
  phase3: {
    heading: 'What are you doing or thinking about doing?',
    subheading:
      'Be honest! I am not here to judge, I am here to protect you from yourself!',
    options: [
      { value: 'deep-breath', label: 'Breathing exercises — good for you!', isCoping: true },
      { value: 'walk', label: 'Going for a walk — excellent!', isCoping: true },
      { value: 'call-someone', label: 'Calling someone who loves you!', isCoping: true },
      { value: 'journaling', label: 'Writing it all down — so proud!', isCoping: true },
      { value: 'scrolling', label: 'Mindless scrolling — absolutely not!', isCoping: false },
      { value: 'isolation', label: 'Hiding from everyone!', isCoping: false },
      { value: 'binge-urge', label: 'Thinking about bingeing — that is why we are here!', isCoping: false },
      { value: 'avoidance', label: 'Pretending everything is fine!', isCoping: false },
    ],
    submitLabel: 'Done, I faced it!',
  },
  summary: {
    heading: 'You did it! I am so proud of you!',
    subheading:
      'You pressed STOP and you actually went through with it! That is not easy but you did it anyway!',
    doneLabel: 'Close',
    storySectionLabel: 'Someone just like you made it through!',
  },
  exitConfirm: {
    heading: 'Are you sure you want to leave?',
    body: 'Beta, you are so close! Your answers are saved. Come back and finish this, okay?',
    confirmLabel: 'Leave for now',
    cancelLabel: 'No, I will finish this!',
  },
}

export const WIZARD_COPY: Record<ToneMode, WizardCopy> = { calm, rational, auntie }
