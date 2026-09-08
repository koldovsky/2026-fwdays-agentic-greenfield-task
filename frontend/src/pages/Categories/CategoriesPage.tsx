import { useEffect, useState, type FormEvent } from 'react'

import {
  ApiError,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type Category,
} from '../../api'
import './categories.css'

const DEFAULT_COLOR = '#7c6cf0' // brand accent (DESIGN §3), a calm starting swatch

type LoadState = 'loading' | 'ready' | 'error'

// --- Inline SVG icons (stroke 1.5, currentColor; NFR-DES-01: never emoji) -----

function IconPlus() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17v3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback
}

// --- Card edit form ----------------------------------------------------------

function CategoryCard({
  category,
  onSaved,
  onDeleted,
}: {
  category: Category
  onSaved: (updated: Category) => void
  onDeleted: (id: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color)
  const [description, setDescription] = useState(category.description ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function startEdit() {
    setName(category.name)
    setColor(category.color)
    setDescription(category.description ?? '')
    setError('')
    setEditing(true)
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const updated = await updateCategory(category.id, {
        name: name.trim(),
        color,
        description: description.trim() ? description.trim() : null,
      })
      onSaved(updated)
      setEditing(false)
    } catch (err) {
      setError(errorText(err, 'Could not save the category.'))
    } finally {
      setBusy(false)
    }
  }

  async function onConfirmDelete() {
    setBusy(true)
    setError('')
    try {
      await deleteCategory(category.id)
      onDeleted(category.id)
    } catch (err) {
      setError(errorText(err, 'Could not delete the category.'))
      setBusy(false)
      setConfirmingDelete(false)
    }
  }

  if (editing) {
    return (
      <form className="category-card category-card--editing" onSubmit={onSubmit}>
        <div className="cat-card-swatch cat-card-swatch--edit" style={{ backgroundColor: color }} aria-hidden="true" />
        <div className="cat-card-body">
          <label className="field-label" htmlFor={`name-${category.id}`}>
            Name
          </label>
          <input
            id={`name-${category.id}`}
            className="cat-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
          />
          <label className="field-label" htmlFor={`desc-${category.id}`}>
            Description
          </label>
          <input
            id={`desc-${category.id}`}
            className="cat-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
          <div className="cat-form-row">
            <label className="field-label" htmlFor={`color-${category.id}`}>
              Color
            </label>
            <input
              id={`color-${category.id}`}
              type="color"
              className="cat-color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          {error && (
            <p className="cat-error" role="alert">
              {error}
            </p>
          )}
          <div className="cat-actions-row">
            <button type="submit" className="btn-accent" disabled={busy}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setEditing(false)}
              disabled={busy}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    )
  }

  return (
    <article className="category-card">
      <div className="cat-card-swatch" style={{ backgroundColor: category.color }} aria-hidden="true">
        <div className="cat-card-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={startEdit}
            aria-label={`Edit ${category.name}`}
          >
            <IconEdit />
          </button>
          <button
            type="button"
            className="icon-btn del"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete ${category.name}`}
          >
            <IconTrash />
          </button>
        </div>
      </div>
      <div className="cat-card-body">
        <h3 className="cat-card-name">{category.name}</h3>
        {category.description && <p className="cat-card-desc">{category.description}</p>}
        {error && (
          <p className="cat-error" role="alert">
            {error}
          </p>
        )}
        {confirmingDelete && (
          <div className="cat-confirm" role="alertdialog" aria-label="Confirm delete">
            <span className="cat-confirm-text">Delete this category?</span>
            <div className="cat-actions-row">
              <button type="button" className="btn-danger" onClick={onConfirmDelete} disabled={busy}>
                {busy ? 'Deleting…' : 'Delete'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  )
}

// --- New-category form -------------------------------------------------------

function NewCategoryForm({ onCreated }: { onCreated: (created: Category) => void }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const created = await createCategory({
        name: name.trim(),
        color,
        description: description.trim() ? description.trim() : null,
      })
      onCreated(created)
      setName('')
      setDescription('')
      setColor(DEFAULT_COLOR)
    } catch (err) {
      setError(errorText(err, 'Could not create the category.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="new-category" onSubmit={onSubmit}>
      <span className="micro-label">New category</span>
      <div className="new-category-fields">
        <input
          className="cat-input"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          aria-label="Category name"
          required
        />
        <input
          className="cat-input"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          aria-label="Category description"
        />
        <input
          type="color"
          className="cat-color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          aria-label="Category color"
        />
        <button type="submit" className="btn-accent new-category-submit" disabled={busy}>
          <IconPlus />
          {busy ? 'Adding…' : 'New category'}
        </button>
      </div>
      {error && (
        <p className="cat-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}

// --- Screen ------------------------------------------------------------------

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [state, setState] = useState<LoadState>('loading')

  useEffect(() => {
    let active = true
    listCategories()
      .then((rows) => {
        if (active) {
          setCategories(rows)
          setState('ready')
        }
      })
      .catch(() => {
        if (active) setState('error')
      })
    return () => {
      active = false
    }
  }, [])

  function onCreated(created: Category) {
    setCategories((prev) => [...prev, created])
  }

  function onSaved(updated: Category) {
    setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
  }

  function onDeleted(id: number) {
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="view">
      <div className="categories-header">
        <div className="categories-heading">
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Organize your tracked time. Deleting a category archives it.</p>
        </div>
      </div>

      <NewCategoryForm onCreated={onCreated} />

      {state === 'loading' && <p className="micro-label categories-status">Loading…</p>}
      {state === 'error' && (
        <p className="cat-error categories-status" role="alert">
          Could not load your categories. Please try again.
        </p>
      )}
      {state === 'ready' && categories.length === 0 && (
        <p className="categories-empty">No categories yet. Create your first one above.</p>
      )}
      {state === 'ready' && categories.length > 0 && (
        <div className="categories-grid">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onSaved={onSaved}
              onDeleted={onDeleted}
            />
          ))}
        </div>
      )}
    </div>
  )
}
