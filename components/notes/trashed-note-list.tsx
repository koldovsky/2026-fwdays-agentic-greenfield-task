import type { Note } from "@prisma/client";
import { NoteCard } from "@notely-design/components";
import { NoteEmptyState } from "@/components/notes/note-empty-state";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

function snippetOf(content: string) {
  const trimmed = content.trim();
  return trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed;
}

export function TrashedNoteList({ notes }: { notes: Note[] }) {
  if (notes.length === 0) {
    return (
      <NoteEmptyState
        icon="trash-2"
        title="Trash is empty"
        description="Notes you delete will show up here for 30 days."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          title={note.title || "Untitled"}
          snippet={snippetOf(note.content)}
          date={note.deletedAt ? dateFormatter.format(note.deletedAt) : undefined}
          style={{ cursor: "default" }}
        />
      ))}
    </div>
  );
}
