import { Button } from "@notely-design/components";
import { verifySession } from "@/app/lib/dal";
import { listActiveNotes } from "@/lib/notes/queries";
import { NoteList } from "@/components/notes/note-list";
import { createNote } from "@/app/actions/notes";

export default async function NotesPage() {
  const { userId } = await verifySession();
  const notes = await listActiveNotes(userId);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-4 sm:px-6">
        <h1 className="t-h2" style={{ color: "var(--color-text)" }}>
          All notes
        </h1>
        <form action={createNote}>
          <Button type="submit" variant="primary">
            New note
          </Button>
        </form>
      </div>
      <NoteList notes={notes} />
    </div>
  );
}
