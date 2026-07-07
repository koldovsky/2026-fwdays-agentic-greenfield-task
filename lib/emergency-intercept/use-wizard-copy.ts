'use client'

import { useToneEngineStore } from '@/store/tone-engine'
import { WIZARD_COPY, type WizardCopy } from './copy'

export function useWizardCopy(): WizardCopy {
  const mode = useToneEngineStore((s) => s.activeToneMode) ?? 'calm'
  return WIZARD_COPY[mode]
}
