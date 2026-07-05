"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertSameOrigin } from "@/app/lib/csrf";
import { verifySession } from "@/app/lib/dal";
import { TagInputSchema } from "@/lib/tags/definitions";

export type TagActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function createTag(name: string): Promise<TagActionResult> {
  await assertSameOrigin();
  const { userId } = await verifySession();

  const validated = TagInputSchema.safeParse({ name });
  if (!validated.success) {
    return { ok: false, error: "Tag name is invalid." };
  }

  await prisma.tag.create({
    data: { userId, name: validated.data.name },
  });

  revalidatePath("/notes", "layout");
  return { ok: true };
}

export async function renameTag(
  id: string,
  name: string
): Promise<TagActionResult> {
  await assertSameOrigin();
  const { userId } = await verifySession();

  const validated = TagInputSchema.safeParse({ name });
  if (!validated.success) {
    return { ok: false, error: "Tag name is invalid." };
  }

  const { count } = await prisma.tag.updateMany({
    where: { id, userId },
    data: { name: validated.data.name },
  });

  if (count === 0) {
    return { ok: false, error: "Tag not found." };
  }

  revalidatePath("/notes", "layout");
  return { ok: true };
}

export async function deleteTag(id: string): Promise<TagActionResult> {
  await assertSameOrigin();
  const { userId } = await verifySession();

  const { count } = await prisma.tag.deleteMany({
    where: { id, userId },
  });

  if (count === 0) {
    return { ok: false, error: "Tag not found." };
  }

  revalidatePath("/notes", "layout");
  return { ok: true };
}
