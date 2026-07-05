import Link from "next/link";
import type { Note } from "@prisma/client";
import { NoteCard } from "@notely-design/components";
import { NoteEmptyState } from "@/app/components/notes/note-empty-state";
import { createNote } from "@/app/actions/notes";
import { renderSnippetHtml } from "@/lib/markdown/snippet";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

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
            snippet={renderSnippetHtml(note.content)}
            date={dateFormatter.format(note.updatedAt)}
          />
        </Link>
      ))}
    </div>
  );
}
