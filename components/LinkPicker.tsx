'use client'

import { useState } from 'react'
import { Button } from '@/components/ds/core/Button'

/**
 * Lets the user pick an existing book/note target and append its
 * `book:`/`note:` string to a links field.
 */
export function LinkPicker({
  targets,
  onAppend,
}: {
  targets: { value: string; label: string }[]
  onAppend: (value: string) => void
}) {
  const [pick, setPick] = useState('')

  function append() {
    if (!pick) return
    onAppend(pick)
    setPick('')
  }

  return (
    <div>
      <label className="bs-eyebrow" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Link to existing</label>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <select
          aria-label="Link to existing"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          className="bs-input"
          style={{ flex: 1 }}
        >
          <option value="">— choose a book or note —</option>
          {targets.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <Button type="button" variant="secondary" onClick={append}>Add link</Button>
      </div>
    </div>
  )
}
