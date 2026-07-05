import { verifySession } from "@/app/lib/dal";
import { listArchivedNotes } from "@/lib/notes/queries";
import { NoteList } from "@/app/components/notes/note-list";

export default async function ArchivePage() {
  const { userId } = await verifySession();
  const notes = await listArchivedNotes(userId);

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4 sm:px-6">
        <h1 className="t-h2" style={{ color: "var(--color-text)" }}>
          Archive
        </h1>
      </div>
      <NoteList
        notes={notes}
        emptyState={{
          icon: "archive",
          title: "Nothing archived yet",
          description: "Notes you archive will show up here.",
        }}
      />
    </div>
  );
}
