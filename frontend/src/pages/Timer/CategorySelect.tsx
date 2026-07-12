import { useEffect, useRef, useState } from 'react'

import { createCategory, type Category } from '../../api'

// A small palette to seed the colour of an inline-created category.
const NEW_COLORS = ['#7c6cf0', '#f59e0b', '#22d3ee', '#f43f5e', '#84cc16', '#38bdf8', '#a78bfa', '#fb7185']

/**
 * Custom category dropdown in the delibra "cdd" style — a rounded pill trigger
 * with a glowing colour dot and a panel that drops directly under it. When an
 * `onCreated` handler is given it also offers a "+ New category" row that creates
 * a category inline (name + colour) without leaving the timer, then selects it.
 */
export default function CategorySelect({
  categories,
  value,
  onChange,
  onCreated,
  ariaLabel = 'Category',
}: {
  categories: Category[]
  value: number | null
  onChange: (id: number) => void
  onCreated?: (created: Category) => void
  ariaLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(NEW_COLORS[0])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const wrapRef = useRef<HTMLDivElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const selected = categories.find((c) => c.id === value) ?? null

  function closeAll() {
    setOpen(false)
    setCreating(false)
    setErr('')
  }

  // Close on any click/tap outside the widget.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) closeAll()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Entering create mode: focus the name field and seed a fresh colour.
  useEffect(() => {
    if (!creating) return
    setNewColor(NEW_COLORS[categories.length % NEW_COLORS.length])
    nameRef.current?.focus()
  }, [creating]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submitNew() {
    const name = newName.trim()
    if (!name) {
      setErr('Name is required.')
      return
    }
    setBusy(true)
    setErr('')
    try {
      const created = await createCategory({ name, color: newColor })
      onCreated?.(created)
      onChange(created.id)
      setNewName('')
      closeAll()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not create the category.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cdd" ref={wrapRef}>
      <button
        type="button"
        className="cdd-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? closeAll() : setOpen(true))}
      >
        {selected && (
          <span
            className="cdd-dot"
            style={{ background: selected.color, color: selected.color }}
            aria-hidden="true"
          />
        )}
        <span className={selected ? 'cdd-label' : 'cdd-placeholder'}>
          {selected ? selected.name : 'Select…'}
        </span>
        <svg className="cdd-chev" width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="cdd-panel" role="listbox" aria-label={ariaLabel}>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              role="option"
              aria-selected={c.id === value}
              className={`cdd-option${c.id === value ? ' selected' : ''}`}
              onClick={() => {
                onChange(c.id)
                closeAll()
              }}
            >
              <span
                className="cdd-dot"
                style={{ background: c.color, color: c.color }}
                aria-hidden="true"
              />
              <span className="cdd-label">{c.name}</span>
              {c.id === value && (
                <svg
                  className="cdd-check"
                  width="12"
                  height="10"
                  viewBox="0 0 12 10"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M1 5l3.5 3.5L11 1"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}

          {onCreated && (
            <>
              <div className="cdd-sep" />
              {creating ? (
                <div className="cdd-new-form">
                  <input
                    type="color"
                    className="cdd-new-color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    aria-label="New category colour"
                  />
                  <input
                    ref={nameRef}
                    className="cdd-new-input"
                    placeholder="Category name"
                    value={newName}
                    maxLength={100}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void submitNew()
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        setCreating(false)
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="cdd-new-add"
                    onClick={() => void submitNew()}
                    disabled={busy}
                  >
                    {busy ? '…' : 'Add'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="cdd-option cdd-new"
                  onClick={() => setCreating(true)}
                >
                  <span className="cdd-plus" aria-hidden="true">
                    +
                  </span>
                  <span className="cdd-label">New category</span>
                </button>
              )}
              {err && <div className="cdd-new-err">{err}</div>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
