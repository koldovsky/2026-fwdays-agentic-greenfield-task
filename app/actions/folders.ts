"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/app/lib/csrf";
import { verifySession } from "@/app/lib/dal";
import { FolderInputSchema } from "@/lib/folders/definitions";

export type FolderActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createFolder(name: string): Promise<FolderActionResult> {
  await assertSameOrigin();
  const { userId } = await verifySession();

  const validated = FolderInputSchema.safeParse({ name });
  if (!validated.success) {
    return { ok: false, error: "Folder name is invalid." };
  }

  await prisma.folder.create({
    data: { userId, name: validated.data.name },
  });

  revalidatePath("/notes", "layout");
  return { ok: true };
}

export async function renameFolder(
  id: string,
  name: string
): Promise<FolderActionResult> {
  await assertSameOrigin();
  const { userId } = await verifySession();

  const validated = FolderInputSchema.safeParse({ name });
  if (!validated.success) {
    return { ok: false, error: "Folder name is invalid." };
  }

  const { count } = await prisma.folder.updateMany({
    where: { id, userId },
    data: { name: validated.data.name },
  });

  if (count === 0) {
    return { ok: false, error: "Folder not found." };
  }

  revalidatePath("/notes", "layout");
  return { ok: true };
}

export async function deleteFolder(id: string): Promise<FolderActionResult> {
  await assertSameOrigin();
  const { userId } = await verifySession();

  const { count } = await prisma.folder.deleteMany({
    where: { id, userId },
  });

  if (count === 0) {
    return { ok: false, error: "Folder not found." };
  }

  revalidatePath("/notes", "layout");
  return { ok: true };
}
