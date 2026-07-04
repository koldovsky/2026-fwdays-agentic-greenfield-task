import { notFound } from "next/navigation";
import { verifySession } from "@/app/lib/dal";
import { getOwnedFolder } from "@/lib/folders/queries";
import { listNotesByFolder } from "@/lib/notes/queries";
import { NoteList } from "@/components/notes/note-list";

export default async function FolderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await verifySession();
  const folder = await getOwnedFolder(userId, id);

  if (!folder) {
    notFound();
  }

  const notes = await listNotesByFolder(userId, id);

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4 sm:px-6">
        <h1 className="t-h2" style={{ color: "var(--color-text)" }}>
          {folder.name}
        </h1>
      </div>
      <NoteList notes={notes} />
    </div>
  );
}
