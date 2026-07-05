import { verifySession } from "@/app/lib/dal";
import { listFavoriteNotes } from "@/lib/notes/queries";
import { NoteList } from "@/app/components/notes/note-list";

export default async function FavoritesPage() {
  const { userId } = await verifySession();
  const notes = await listFavoriteNotes(userId);

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4 sm:px-6">
        <h1 className="t-h2" style={{ color: "var(--color-text)" }}>
          Favorites
        </h1>
      </div>
      <NoteList
        notes={notes}
        emptyState={{
          icon: "star",
          title: "No favorites yet",
          description: "Notes you favorite will show up here.",
        }}
      />
    </div>
  );
}
