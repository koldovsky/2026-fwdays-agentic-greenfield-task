'use client'

import { useToneEngineStore } from '@/store/tone-engine'
import { DASHBOARD_COPY, type DashboardCopy } from './copy'

export function useDashboardCopy(): DashboardCopy {
  const mode = useToneEngineStore((s) => s.activeToneMode) ?? 'calm'
  return DASHBOARD_COPY[mode]
}
