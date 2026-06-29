'use client'

import { useState } from 'react'
import type { Note, HighlighterKey } from '@/lib/content/types'
import { HighlighterPicker } from '@/components/ds/book/HighlighterPicker'
import { Input } from '@/components/ds/core/Input'
import { Textarea } from '@/components/ds/core/Textarea'
import { Button } from '@/components/ds/core/Button'
import { LinkPicker } from '@/components/LinkPicker'
import { NOTE_COLORS } from '@/lib/content/colors'

export function NoteForm({
  action, deleteAction, slug, id, note, targets,
}: {
  action: (fd: FormData) => void
  deleteAction?: (fd: FormData) => void
  slug: string
  id?: string
  note?: Note
  targets: { value: string; label: string }[]
}) {
  const noteId = note?.id ?? id ?? ''
  const [color, setColor] = useState<HighlighterKey>(note?.color ?? 'yellow')
  const [links, setLinks] = useState(note?.links.join('\n') ?? '')

  function appendLink(value: string) {
    setLinks((cur) => (cur.trim() ? `${cur.trim()}\n${value}` : value))
  }

  return (
    <>
      <form action={action} style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: 560 }}>
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="id" value={noteId} />
        <input type="hidden" name="color" value={color} />

        <div>
          <label className="bs-eyebrow" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>Highlighter</label>
          <HighlighterPicker value={color} onChange={setColor} />
          {/* legend: what each highlighter color means; the selected one is emphasized */}
          <ul
            aria-label="Highlighter color meanings"
            style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '6px 14px', padding: 0, margin: 'var(--space-3) 0 0', fontSize: 'var(--text-xs)' }}
          >
            {NOTE_COLORS.map((c) => (
              <li
                key={c.value}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  opacity: color === c.value ? 1 : 0.6,
                  fontWeight: color === c.value ? 'var(--weight-semibold)' : 'var(--weight-regular)',
                  color: color === c.value ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                <span style={{ width: 11, height: 11, borderRadius: '50%', background: `var(--hl-${c.value})`, boxShadow: 'inset 0 0 0 1px #00000014' }} />
                {c.label}
              </li>
            ))}
          </ul>
        </div>

        <Textarea label="Quoted passage" name="excerpt" rows={2} ruled defaultValue={note?.excerpt ?? ''} />
        <Textarea label="Your note" name="body" rows={5} ruled defaultValue={note?.body ?? ''} />
        <Input label="Page" name="page" type="number" min={1} defaultValue={note?.page ?? ''} />

        <LinkPicker targets={targets} onAppend={appendLink} />

        <Textarea label="Links (one per line)" name="links" rows={3} value={links} onChange={(e) => setLinks(e.target.value)} />

        <div><Button type="submit">Save</Button></div>
      </form>

      {note && deleteAction && (
        <form action={deleteAction} style={{ marginTop: 'var(--space-4)' }}>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="id" value={note.id} />
          <Button type="submit" variant="danger">Delete note</Button>
        </form>
      )}
    </>
  )
}
