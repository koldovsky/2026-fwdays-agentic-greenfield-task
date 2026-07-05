import { verifySession } from "@/app/lib/dal";
import { listPinnedNotes } from "@/lib/notes/queries";
import { NoteList } from "@/app/components/notes/note-list";

export default async function PinnedPage() {
  const { userId } = await verifySession();
  const notes = await listPinnedNotes(userId);

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4 sm:px-6">
        <h1 className="t-h2" style={{ color: "var(--color-text)" }}>
          Pinned
        </h1>
      </div>
      <NoteList
        notes={notes}
        emptyState={{
          icon: "pin",
          title: "No pinned notes yet",
          description: "Notes you pin will show up here.",
        }}
      />
    </div>
  );
}
