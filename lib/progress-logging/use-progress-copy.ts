'use client'

import { useToneEngineStore } from '@/store/tone-engine'
import { PROGRESS_COPY, type ProgressCopy } from './copy'

export function useProgressCopy(): ProgressCopy {
  const mode = useToneEngineStore((s) => s.activeToneMode) ?? 'calm'
  return PROGRESS_COPY[mode]
}
