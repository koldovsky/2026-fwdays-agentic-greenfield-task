import { verifySession } from "@/app/lib/dal";
import { listTrashedNotes } from "@/lib/notes/queries";
import { TrashedNoteList } from "@/app/components/notes/trashed-note-list";

export default async function TrashPage() {
  const { userId } = await verifySession();
  const notes = await listTrashedNotes(userId);

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4 sm:px-6">
        <h1 className="t-h2" style={{ color: "var(--color-text)" }}>
          Trash
        </h1>
      </div>
      <TrashedNoteList notes={notes} />
    </div>
  );
}
