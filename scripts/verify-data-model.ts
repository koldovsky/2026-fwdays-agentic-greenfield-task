import { PrismaClient } from "@prisma/client";
import { purgeExpiredNotes, RETENTION_DAYS } from "../lib/notes/purge";
import { listActiveNotes, listTrashedNotes } from "../lib/notes/queries";

const prisma = new PrismaClient();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAILED: ${message}`);
}

async function main() {
  const user = await prisma.user.create({
    data: { email: `verify-${Date.now()}@notely.dev`, passwordHash: "x" },
  });
  const folder = await prisma.folder.create({
    data: { name: "Scratch", userId: user.id },
  });
  const tag = await prisma.tag.create({
    data: { name: "verify", userId: user.id },
  });

  const note = await prisma.note.create({
    data: {
      userId: user.id,
      folderId: folder.id,
      title: "Verify note",
      content: "content",
      tags: { create: [{ tagId: tag.id }] },
    },
  });
  assert(note.userId === user.id, "note created with owner");

  await prisma.folder.delete({ where: { id: folder.id } });
  const afterFolderDelete = await prisma.note.findUniqueOrThrow({ where: { id: note.id } });
  assert(afterFolderDelete.folderId === null, "folder delete sets note.folderId to null, note survives");

  await prisma.tag.delete({ where: { id: tag.id } });
  const noteTagCount = await prisma.noteTag.count({ where: { noteId: note.id } });
  assert(noteTagCount === 0, "tag delete removes NoteTag rows");
  const noteAfterTagDelete = await prisma.note.findUnique({ where: { id: note.id } });
  assert(noteAfterTagDelete !== null, "note survives tag delete");

  await prisma.note.update({ where: { id: note.id }, data: { deletedAt: new Date() } });
  const active = await listActiveNotes(user.id);
  assert(active.length === 0, "soft-deleted note excluded from active list");
  const trashed = await listTrashedNotes(user.id);
  assert(trashed.length === 1, "soft-deleted note appears in trash list");

  await purgeExpiredNotes();
  const stillThere = await prisma.note.findUnique({ where: { id: note.id } });
  assert(stillThere !== null, "purge leaves recently-deleted notes alone");

  const expiredAt = new Date(Date.now() - (RETENTION_DAYS + 1) * 24 * 60 * 60 * 1000);
  await prisma.note.update({ where: { id: note.id }, data: { deletedAt: expiredAt } });
  const { purged } = await purgeExpiredNotes();
  assert(purged >= 1, "purge removes notes past the retention window");
  const goneNow = await prisma.note.findUnique({ where: { id: note.id } });
  assert(goneNow === null, "note is gone after purge cutoff passes");

  await prisma.user.delete({ where: { id: user.id } });

  console.log(`All checks passed (purged=${purged})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
