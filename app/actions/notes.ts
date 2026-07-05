"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/app/lib/csrf";
import { verifySession } from "@/app/lib/dal";
import { NoteInputSchema } from "@/lib/notes/definitions";
import { TagInputSchema } from "@/lib/tags/definitions";

export async function createNote() {
  await assertSameOrigin();
  const { userId } = await verifySession();

  const note = await prisma.note.create({
    data: { userId, title: "", content: "" },
    select: { id: true },
  });

  revalidatePath("/notes");
  redirect(`/notes/${note.id}`);
}

export type UpdateNoteResult =
  | { ok: true; updatedAt: string }
  | { ok: false; error: string };

export async function updateNote(
  id: string,
  input: { title: string; content: string }
): Promise<UpdateNoteResult> {
  await assertSameOrigin();
  const { userId } = await verifySession();

  const validated = NoteInputSchema.safeParse(input);
  if (!validated.success) {
    return { ok: false, error: "Note content is invalid." };
  }

  const { count } = await prisma.note.updateMany({
    where: { id, userId, deletedAt: null },
    data: validated.data,
  });

  if (count === 0) {
    return { ok: false, error: "Note not found." };
  }

  const note = await prisma.note.findFirst({
    where: { id, userId },
    select: { updatedAt: true },
  });

  revalidatePath("/notes");
  return { ok: true, updatedAt: (note?.updatedAt ?? new Date()).toISOString() };
}

export async function softDeleteNote(id: string) {
  await assertSameOrigin();
  const { userId } = await verifySession();

  await prisma.note.updateMany({
    where: { id, userId, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/notes");
  revalidatePath("/trash");
  redirect("/notes");
}

export type NoteRelationResult = { ok: true } | { ok: false; error: string };

export async function assignNoteFolder(
  noteId: string,
  folderId: string | null
): Promise<NoteRelationResult> {
  await assertSameOrigin();
  const { userId } = await verifySession();

  const existing = await prisma.note.findFirst({
    where: { id: noteId, userId, deletedAt: null },
    select: { folderId: true },
  });
  if (!existing) {
    return { ok: false, error: "Note not found." };
  }

  if (folderId !== null) {
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId },
      select: { id: true },
    });
    if (!folder) {
      return { ok: false, error: "Folder not found." };
    }
  }

  await prisma.note.update({
    where: { id: noteId },
    data: { folderId },
  });

  revalidatePath("/notes", "layout");
  if (existing.folderId) revalidatePath(`/folders/${existing.folderId}`);
  if (folderId) revalidatePath(`/folders/${folderId}`);
  return { ok: true };
}

export async function addNoteTag(
  noteId: string,
  tagId: string
): Promise<NoteRelationResult> {
  await assertSameOrigin();
  const { userId } = await verifySession();

  const [note, tag] = await Promise.all([
    prisma.note.findFirst({
      where: { id: noteId, userId, deletedAt: null },
      select: { id: true },
    }),
    prisma.tag.findFirst({ where: { id: tagId, userId }, select: { id: true } }),
  ]);

  if (!note || !tag) {
    return { ok: false, error: "Note or tag not found." };
  }

  await prisma.noteTag.upsert({
    where: { noteId_tagId: { noteId, tagId } },
    create: { noteId, tagId },
    update: {},
  });

  revalidatePath("/notes", "layout");
  revalidatePath(`/tags/${tagId}`);
  return { ok: true };
}

export async function removeNoteTag(
  noteId: string,
  tagId: string
): Promise<NoteRelationResult> {
  await assertSameOrigin();
  const { userId } = await verifySession();

  const note = await prisma.note.findFirst({
    where: { id: noteId, userId, deletedAt: null },
    select: { id: true },
  });
  if (!note) {
    return { ok: false, error: "Note not found." };
  }

  await prisma.noteTag.deleteMany({ where: { noteId, tagId } });

  revalidatePath("/notes", "layout");
  revalidatePath(`/tags/${tagId}`);
  return { ok: true };
}

export type CreateAndAssignTagResult =
  | { ok: true; tag: { id: string; name: string } }
  | { ok: false; error: string };

export async function createAndAssignTag(
  noteId: string,
  name: string
): Promise<CreateAndAssignTagResult> {
  await assertSameOrigin();
  const { userId } = await verifySession();

  const validated = TagInputSchema.safeParse({ name });
  if (!validated.success) {
    return { ok: false, error: "Tag name is invalid." };
  }

  const note = await prisma.note.findFirst({
    where: { id: noteId, userId, deletedAt: null },
    select: { id: true },
  });
  if (!note) {
    return { ok: false, error: "Note not found." };
  }

  const tag = await prisma.tag.create({
    data: { userId, name: validated.data.name },
  });
  await prisma.noteTag.create({ data: { noteId, tagId: tag.id } });

  revalidatePath("/notes", "layout");
  revalidatePath(`/tags/${tag.id}`);
  return { ok: true, tag: { id: tag.id, name: tag.name } };
}

export async function toggleNoteFavorite(id: string): Promise<NoteRelationResult> {
  await assertSameOrigin();
  const { userId } = await verifySession();

  const existing = await prisma.note.findFirst({
    where: { id, userId, deletedAt: null },
    select: { isFavorite: true },
  });
  if (!existing) {
    return { ok: false, error: "Note not found." };
  }

  await prisma.note.update({
    where: { id },
    data: { isFavorite: !existing.isFavorite },
  });

  revalidatePath("/notes", "layout");
  revalidatePath("/favorites");
  return { ok: true };
}

export async function toggleNotePinned(id: string): Promise<NoteRelationResult> {
  await assertSameOrigin();
  const { userId } = await verifySession();

  const existing = await prisma.note.findFirst({
    where: { id, userId, deletedAt: null },
    select: { isPinned: true },
  });
  if (!existing) {
    return { ok: false, error: "Note not found." };
  }

  await prisma.note.update({
    where: { id },
    data: { isPinned: !existing.isPinned },
  });

  revalidatePath("/notes", "layout");
  revalidatePath("/pinned");
  return { ok: true };
}

export async function toggleNoteArchived(id: string): Promise<NoteRelationResult> {
  await assertSameOrigin();
  const { userId } = await verifySession();

  const existing = await prisma.note.findFirst({
    where: { id, userId, deletedAt: null },
    select: { isArchived: true },
  });
  if (!existing) {
    return { ok: false, error: "Note not found." };
  }

  await prisma.note.update({
    where: { id },
    data: { isArchived: !existing.isArchived },
  });

  revalidatePath("/notes", "layout");
  revalidatePath("/archive");
  return { ok: true };
}

export async function duplicateNote(id: string) {
  await assertSameOrigin();
  const { userId } = await verifySession();

  const source = await prisma.note.findFirst({
    where: { id, userId, deletedAt: null },
    include: { tags: true },
  });
  if (!source) {
    return;
  }

  const duplicateTitle = source.title ? `Copy of ${source.title}` : "";

  const duplicate = await prisma.note.create({
    data: {
      userId,
      title: duplicateTitle,
      content: source.content,
      folderId: source.folderId,
    },
    select: { id: true },
  });

  if (source.tags.length > 0) {
    await prisma.noteTag.createMany({
      data: source.tags.map((noteTag) => ({
        noteId: duplicate.id,
        tagId: noteTag.tagId,
      })),
    });
  }

  revalidatePath("/notes");
  redirect(`/notes/${duplicate.id}?duplicated=true`);
}
