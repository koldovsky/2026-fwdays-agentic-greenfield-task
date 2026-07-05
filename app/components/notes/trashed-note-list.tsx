import type { Note } from "@prisma/client";
import { NoteCard } from "@notely-design/components";
import { NoteEmptyState } from "@/app/components/notes/note-empty-state";
import { renderSnippetHtml } from "@/lib/markdown/snippet";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

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
          snippet={renderSnippetHtml(note.content)}
          date={note.deletedAt ? dateFormatter.format(note.deletedAt) : undefined}
          style={{ cursor: "default" }}
        />
      ))}
    </div>
  );
}
