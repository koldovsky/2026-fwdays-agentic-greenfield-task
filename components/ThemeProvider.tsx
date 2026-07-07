'use client'

import { useEffect } from 'react'
import { useToneEngineStore } from '@/store/tone-engine'

export function ThemeProvider() {
  const mode = useToneEngineStore((s) => s.activeToneMode)

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode)
  }, [mode])

  return null
}
