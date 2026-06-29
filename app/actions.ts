'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import path from 'node:path'
import { createBook, updateBook } from '@/lib/content/books'
import { saveNote, deleteNote } from '@/lib/content/notes'
import { atomicWriteBuffer } from '@/lib/content/fs-utils'
import { bookDir } from '@/lib/content/paths'
import { str, bookMetaFromForm, noteFromForm } from '@/lib/content/forms'

async function saveCover(slug: string, fd: FormData): Promise<string | undefined> {
  const file = fd.get('cover')
  if (!(file instanceof File) || file.size === 0) return undefined
  const ext = path.extname(file.name) || '.img'
  const filename = `cover${ext}`
  await atomicWriteBuffer(path.join(bookDir(slug), filename), Buffer.from(await file.arrayBuffer()))
  return filename
}

export async function createBookAction(fd: FormData): Promise<void> {
  const meta = bookMetaFromForm(fd)
  const slug = await createBook(meta, '', str(fd, 'slug') || undefined)
  const cover = await saveCover(slug, fd)
  if (cover) await updateBook(slug, { ...meta, cover }, '')
  revalidatePath('/')
  redirect(`/book/${slug}`)
}

export async function updateBookAction(fd: FormData): Promise<void> {
  const slug = str(fd, 'slug')
  const meta = bookMetaFromForm(fd)
  const cover = (await saveCover(slug, fd)) ?? (str(fd, 'existingCover') || undefined)
  await updateBook(slug, { ...meta, cover }, str(fd, 'body'))
  revalidatePath('/')
  revalidatePath(`/book/${slug}`)
  redirect(`/book/${slug}`)
}

export async function saveNoteAction(fd: FormData): Promise<void> {
  const { slug, note } = noteFromForm(fd)
  await saveNote(slug, note)
  revalidatePath(`/book/${slug}`)
  redirect(`/book/${slug}#${note.id}`)
}

export async function deleteNoteAction(fd: FormData): Promise<void> {
  const slug = str(fd, 'slug')
  await deleteNote(slug, str(fd, 'id'))
  revalidatePath(`/book/${slug}`)
  redirect(`/book/${slug}`)
}
