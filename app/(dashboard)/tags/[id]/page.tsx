import { notFound } from "next/navigation";
import { verifySession } from "@/app/lib/dal";
import { getOwnedTag } from "@/lib/tags/queries";
import { listNotesByTag } from "@/lib/notes/queries";
import { NoteList } from "@/app/components/notes/note-list";

export default async function TagPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await verifySession();
  const tag = await getOwnedTag(userId, id);

  if (!tag) {
    notFound();
  }

  const notes = await listNotesByTag(userId, id);

  return (
    <div className="flex flex-col">
      <div className="px-4 py-4 sm:px-6">
        <h1 className="t-h2" style={{ color: "var(--color-text)" }}>
          #{tag.name}
        </h1>
      </div>
      <NoteList notes={notes} />
    </div>
  );
}
