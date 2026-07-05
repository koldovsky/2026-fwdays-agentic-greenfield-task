import Link from "next/link";
import type { Note } from "@prisma/client";
import { NoteCard } from "@notely-design/components";
import { NoteEmptyState } from "@/app/components/notes/note-empty-state";
import {
  createNote,
  toggleNoteFavorite,
  toggleNotePinned,
} from "@/app/actions/notes";
import { renderSnippetHtml } from "@/lib/markdown/snippet";

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

type NoteListEmptyState = {
  icon: "inbox" | "star" | "pin" | "archive";
  title: string;
  description: string;
};

const defaultEmptyState: NoteListEmptyState = {
  icon: "inbox",
  title: "No notes yet",
  description: "Create your first note to get started.",
};

export function NoteList({
  notes,
  emptyState = defaultEmptyState,
}: {
  notes: Note[];
  emptyState?: NoteListEmptyState;
}) {
  if (notes.length === 0) {
    return (
      <NoteEmptyState
        icon={emptyState.icon}
        title={emptyState.title}
        description={emptyState.description}
        action={
          emptyState.icon === "inbox"
            ? { label: "New note", formAction: createNote }
            : undefined
        }
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
            favorite={note.isFavorite}
            pinned={note.isPinned}
            onToggleFavorite={toggleNoteFavorite.bind(null, note.id)}
            onTogglePin={toggleNotePinned.bind(null, note.id)}
          />
        </Link>
      ))}
    </div>
  );
}
