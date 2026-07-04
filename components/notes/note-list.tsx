import Link from "next/link";
import type { Note } from "@prisma/client";
import { NoteCard } from "@notely-design/components";
import { NoteEmptyState } from "@/components/notes/note-empty-state";
import { createNote } from "@/app/actions/notes";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

function snippetOf(content: string) {
  const trimmed = content.trim();
  return trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed;
}

export function NoteList({ notes }: { notes: Note[] }) {
  if (notes.length === 0) {
    return (
      <NoteEmptyState
        icon="inbox"
        title="No notes yet"
        description="Create your first note to get started."
        action={{ label: "New note", formAction: createNote }}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <Link key={note.id} href={`/notes/${note.id}`}>
          <NoteCard
            title={note.title || "Untitled"}
            snippet={snippetOf(note.content)}
            date={dateFormatter.format(note.updatedAt)}
          />
        </Link>
      ))}
    </div>
  );
}
